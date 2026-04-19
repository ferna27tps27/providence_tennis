/**
 * Hybrid member repository.
 *
 * Uses Prisma/Postgres when DATABASE_URL is configured and falls back to the
 * legacy JSON file store otherwise.
 */

import { UserRole } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";

import { Member, MemberFilter } from "../../types/member";
import { IMemberRepository } from "./member-repository.interface";
import { FileLock } from "../utils/file-lock";
import { memberCache } from "../cache/member-cache";
import {
  MemberNotFoundError,
  DuplicateEmailError,
  DuplicateMemberNumberError,
  MemberLockError,
} from "../errors/member-errors";
import { normalizeEmail } from "../utils/member-validation";
import {
  getPrismaClient,
} from "../db/prisma-client";

function getDataDir(): string {
  return process.env.DATA_DIR
    ? path.isAbsolute(process.env.DATA_DIR)
      ? process.env.DATA_DIR
      : path.join(process.cwd(), process.env.DATA_DIR)
    : path.join(process.cwd(), "data");
}

function getMembersFile(): string {
  return path.join(getDataDir(), "members.json");
}

function mapUserRole(role: UserRole): NonNullable<Member["role"]> {
  switch (role) {
    case UserRole.ADMIN:
      return "admin";
    case UserRole.COACH:
      return "coach";
    case UserRole.PARENT:
      return "parent";
    default:
      return "player";
  }
}

function toUserRole(role?: Member["role"]): UserRole {
  switch (role) {
    case "admin":
      return UserRole.ADMIN;
    case "coach":
      return UserRole.COACH;
    case "parent":
      return UserRole.PARENT;
    default:
      return UserRole.PLAYER;
  }
}

function mapPrismaMember(member: {
  id: string;
  memberNumber: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  penaltyCancellations: number;
  notes: string | null;
  unsubscribeEmail: boolean;
  passwordHash: string | null;
  emailVerified: boolean;
  role: UserRole;
  ntrpRating: string | null;
  ustaNumber: string | null;
}): Member {
  return {
    id: member.id,
    memberNumber: member.memberNumber || "",
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phone: member.phone || "",
    isActive: member.isActive,
    createdAt: member.createdAt.toISOString(),
    lastModified: member.updatedAt.toISOString(),
    dateOfBirth: member.dateOfBirth || undefined,
    gender: member.gender || undefined,
    address: member.address || undefined,
    penaltyCancellations: member.penaltyCancellations,
    notes: member.notes || undefined,
    unsubscribeEmail: member.unsubscribeEmail,
    passwordHash: member.passwordHash || undefined,
    emailVerified: member.emailVerified,
    role: mapUserRole(member.role),
    ntrpRating: member.ntrpRating || undefined,
    ustaNumber: member.ustaNumber || undefined,
  };
}

async function ensureDataFiles(): Promise<void> {
  try {
    const dataDir = getDataDir();
    const membersFile = getMembersFile();
    await fs.mkdir(dataDir, { recursive: true });

    try {
      await fs.access(membersFile);
    } catch {
      await fs.writeFile(membersFile, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error("Error initializing member data files:", error);
    throw error;
  }
}

async function readMembers(): Promise<Member[]> {
  await ensureDataFiles();
  try {
    const data = await fs.readFile(getMembersFile(), "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading members:", error);
    return [];
  }
}

async function writeMembers(members: Member[]): Promise<void> {
  await ensureDataFiles();
  await fs.writeFile(getMembersFile(), JSON.stringify(members, null, 2));
}

async function generateMemberNumber(): Promise<string> {
  const prisma = getPrismaClient();

  if (prisma) {
    const users = await prisma.user.findMany({
      where: {
        memberNumber: {
          startsWith: "MEM-",
        },
      },
      select: {
        memberNumber: true,
      },
    });

    let maxNumber = 0;
    for (const user of users) {
      const match = user.memberNumber?.match(/^MEM-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }

    return `MEM-${String(maxNumber + 1).padStart(4, "0")}`;
  }

  const members = await readMembers();
  let maxNumber = 0;
  for (const member of members) {
    const match = member.memberNumber.match(/^MEM-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  return `MEM-${String(maxNumber + 1).padStart(4, "0")}`;
}

function searchMembers(members: Member[], query: string): Member[] {
  const lowerQuery = query.toLowerCase().trim();

  if (!lowerQuery) {
    return members;
  }

  return members.filter((member) => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    const email = member.email.toLowerCase();
    const phone = member.phone.toLowerCase();
    const memberNumber = member.memberNumber.toLowerCase();

    return (
      fullName.includes(lowerQuery) ||
      email.includes(lowerQuery) ||
      phone.includes(lowerQuery) ||
      memberNumber.includes(lowerQuery)
    );
  });
}

function filterByStatus(members: Member[], status?: "all" | "active" | "inactive"): Member[] {
  if (!status || status === "all") {
    return members;
  }

  return members.filter((member) => (status === "active" ? member.isActive : !member.isActive));
}

function invalidateMemberCaches(
  existingMember?: Member,
  updatedMember?: Member,
  statusChanged?: boolean
): void {
  if (existingMember) {
    memberCache.invalidate(`member:${existingMember.id}`);
    memberCache.invalidate(`member:email:${normalizeEmail(existingMember.email)}`);
    memberCache.invalidate(`member:number:${existingMember.memberNumber}`);
  }

  if (updatedMember && existingMember && existingMember.email !== updatedMember.email) {
    memberCache.invalidate(`member:email:${normalizeEmail(updatedMember.email)}`);
  }

  if (updatedMember && existingMember && existingMember.memberNumber !== updatedMember.memberNumber) {
    memberCache.invalidate(`member:number:${updatedMember.memberNumber}`);
  }

  if (!existingMember && updatedMember) {
    if (updatedMember.isActive) {
      memberCache.invalidate("member:active");
    } else {
      memberCache.invalidate("member:inactive");
    }
  }

  if (statusChanged) {
    memberCache.invalidate("member:active");
    memberCache.invalidate("member:inactive");
  }

  memberCache.invalidate("member:all");
}

export class FileMemberRepository implements IMemberRepository {
  async findAll(filter?: MemberFilter): Promise<Member[]> {
    const cacheKey = filter?.status ? `member:${filter.status}` : "member:all";
    const cached = memberCache.get<Member[]>(cacheKey);
    if (cached) {
      return filter?.search ? searchMembers(cached, filter.search) : cached;
    }

    const prisma = getPrismaClient();
    if (prisma) {
      const users = await prisma.user.findMany({
        where: {
          ...(filter?.status === "active" ? { isActive: true } : {}),
          ...(filter?.status === "inactive" ? { isActive: false } : {}),
        },
        orderBy: [{ createdAt: "desc" }],
      });

      let members = users.map(mapPrismaMember);
      if (filter?.search) {
        members = searchMembers(members, filter.search);
      }

      if (!filter?.search) {
        memberCache.set(cacheKey, members);
      }

      return members;
    }

    let members = await readMembers();
    if (filter?.status) {
      members = filterByStatus(members, filter.status);
    }
    if (filter?.search) {
      members = searchMembers(members, filter.search);
    }
    if (!filter?.search) {
      memberCache.set(cacheKey, members);
    }
    return members;
  }

  async findById(id: string): Promise<Member | null> {
    const cacheKey = `member:${id}`;
    const cached = memberCache.get<Member>(cacheKey);
    if (cached) {
      return cached;
    }

    const prisma = getPrismaClient();
    if (prisma) {
      const user = await prisma.user.findUnique({ where: { id } });
      const member = user ? mapPrismaMember(user) : null;
      if (member) {
        memberCache.set(cacheKey, member);
      }
      return member;
    }

    const members = await readMembers();
    const member = members.find((m) => m.id === id) || null;
    if (member) {
      memberCache.set(cacheKey, member);
    }
    return member;
  }

  async findByEmail(email: string): Promise<Member | null> {
    const normalizedEmail = normalizeEmail(email);
    const cacheKey = `member:email:${normalizedEmail}`;
    const cached = memberCache.get<Member>(cacheKey);
    if (cached) {
      return cached;
    }

    const prisma = getPrismaClient();
    if (prisma) {
      const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      const member = user ? mapPrismaMember(user) : null;
      if (member) {
        memberCache.set(cacheKey, member);
      }
      return member;
    }

    const members = await readMembers();
    const member = members.find((m) => normalizeEmail(m.email) === normalizedEmail) || null;
    if (member) {
      memberCache.set(cacheKey, member);
    }
    return member;
  }

  async findByMemberNumber(memberNumber: string): Promise<Member | null> {
    const cacheKey = `member:number:${memberNumber}`;
    const cached = memberCache.get<Member>(cacheKey);
    if (cached) {
      return cached;
    }

    const prisma = getPrismaClient();
    if (prisma) {
      const user = await prisma.user.findUnique({ where: { memberNumber } });
      const member = user ? mapPrismaMember(user) : null;
      if (member) {
        memberCache.set(cacheKey, member);
      }
      return member;
    }

    const members = await readMembers();
    const member = members.find((m) => m.memberNumber === memberNumber) || null;
    if (member) {
      memberCache.set(cacheKey, member);
    }
    return member;
  }

  async search(query: string): Promise<Member[]> {
    const prisma = getPrismaClient();
    if (prisma) {
      const members = await this.findAll();
      return searchMembers(members, query);
    }

    const members = await readMembers();
    return searchMembers(members, query);
  }

  async create(
    memberData: Omit<Member, "id" | "createdAt" | "lastModified" | "memberNumber" | "isActive"> & {
      memberNumber?: string;
      isActive?: boolean;
    }
  ): Promise<Member> {
    const prisma = getPrismaClient();
    const normalizedEmail = normalizeEmail(memberData.email);

    if (prisma) {
      const existingByEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });
      if (existingByEmail) {
        throw new DuplicateEmailError(`Email ${memberData.email} is already registered`);
      }

      let memberNumber = memberData.memberNumber;
      if (!memberNumber) {
        memberNumber = await generateMemberNumber();
      }

      const existingByNumber = await prisma.user.findUnique({
        where: { memberNumber },
        select: { id: true },
      });
      if (existingByNumber) {
        throw new DuplicateMemberNumberError(`Member number ${memberNumber} already exists`);
      }

      const newMember = await prisma.user.create({
        data: {
          email: normalizedEmail,
          memberNumber,
          firstName: memberData.firstName,
          lastName: memberData.lastName,
          phone: memberData.phone,
          isActive: memberData.isActive !== undefined ? memberData.isActive : true,
          dateOfBirth: memberData.dateOfBirth,
          gender: memberData.gender,
          address: memberData.address,
          notes: memberData.notes,
          ntrpRating: memberData.ntrpRating,
          ustaNumber: memberData.ustaNumber,
          penaltyCancellations: memberData.penaltyCancellations || 0,
          unsubscribeEmail: memberData.unsubscribeEmail || false,
          passwordHash: memberData.passwordHash,
          emailVerified: memberData.emailVerified || false,
          role: toUserRole(memberData.role),
        },
      });

      const mapped = mapPrismaMember(newMember);
      invalidateMemberCaches(undefined, mapped, false);
      return mapped;
    }

    const lock = new FileLock(getMembersFile());
    let release: (() => Promise<void>) | null = null;

    try {
      release = await lock.acquire();
    } catch (error) {
      throw new MemberLockError(
        `Could not acquire lock for member creation: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    try {
      const members = await readMembers();
      const existingByEmail = members.find((m) => normalizeEmail(m.email) === normalizedEmail);
      if (existingByEmail) {
        throw new DuplicateEmailError(`Email ${memberData.email} is already registered`);
      }

      let memberNumber = memberData.memberNumber;
      if (!memberNumber) {
        memberNumber = await generateMemberNumber();
      }

      const existingByNumber = members.find((m) => m.memberNumber === memberNumber);
      if (existingByNumber) {
        throw new DuplicateMemberNumberError(`Member number ${memberNumber} already exists`);
      }

      const newMember: Member = {
        id: Date.now().toString(),
        ...memberData,
        email: normalizedEmail,
        memberNumber,
        isActive: memberData.isActive !== undefined ? memberData.isActive : true,
        penaltyCancellations: memberData.penaltyCancellations || 0,
        unsubscribeEmail: memberData.unsubscribeEmail || false,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      };

      members.push(newMember);
      await writeMembers(members);
      invalidateMemberCaches(undefined, newMember, false);
      return newMember;
    } finally {
      if (release) {
        await release();
      }
    }
  }

  async update(id: string, updates: Partial<Member>): Promise<Member> {
    const prisma = getPrismaClient();

    if (prisma) {
      const existing = await prisma.user.findUnique({ where: { id } });

      if (!existing) {
        throw new MemberNotFoundError(`Member with id ${id}`);
      }

      const existingMember = mapPrismaMember(existing);

      if (updates.email) {
        const normalizedEmail = normalizeEmail(updates.email);
        const existingByEmail = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        });
        if (existingByEmail && existingByEmail.id !== id) {
          throw new DuplicateEmailError(`Email ${updates.email} is already registered`);
        }
        updates.email = normalizedEmail;
      }

      if (updates.memberNumber) {
        const existingByNumber = await prisma.user.findUnique({
          where: { memberNumber: updates.memberNumber },
          select: { id: true },
        });
        if (existingByNumber && existingByNumber.id !== id) {
          throw new DuplicateMemberNumberError(
            `Member number ${updates.memberNumber} already exists`
          );
        }
      }

      const updated = await prisma.user.update({
        where: { id },
        data: {
          ...(updates.memberNumber !== undefined ? { memberNumber: updates.memberNumber } : {}),
          ...(updates.firstName !== undefined ? { firstName: updates.firstName } : {}),
          ...(updates.lastName !== undefined ? { lastName: updates.lastName } : {}),
          ...(updates.email !== undefined ? { email: updates.email } : {}),
          ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
          ...(updates.isActive !== undefined ? { isActive: updates.isActive } : {}),
          ...(updates.dateOfBirth !== undefined ? { dateOfBirth: updates.dateOfBirth } : {}),
          ...(updates.gender !== undefined ? { gender: updates.gender } : {}),
          ...(updates.address !== undefined ? { address: updates.address } : {}),
          ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
          ...(updates.ntrpRating !== undefined ? { ntrpRating: updates.ntrpRating } : {}),
          ...(updates.ustaNumber !== undefined ? { ustaNumber: updates.ustaNumber } : {}),
          ...(updates.penaltyCancellations !== undefined
            ? { penaltyCancellations: updates.penaltyCancellations }
            : {}),
          ...(updates.unsubscribeEmail !== undefined
            ? { unsubscribeEmail: updates.unsubscribeEmail }
            : {}),
          ...(updates.passwordHash !== undefined ? { passwordHash: updates.passwordHash } : {}),
          ...(updates.emailVerified !== undefined ? { emailVerified: updates.emailVerified } : {}),
          ...(updates.role !== undefined ? { role: toUserRole(updates.role) } : {}),
          updatedAt: new Date(),
        },
      });

      const mapped = mapPrismaMember(updated);
      invalidateMemberCaches(
        existingMember,
        mapped,
        updates.isActive !== undefined && existingMember.isActive !== updates.isActive
      );
      return mapped;
    }

    const lock = new FileLock(getMembersFile());
    let release: (() => Promise<void>) | null = null;

    try {
      release = await lock.acquire();
    } catch (error) {
      throw new MemberLockError(
        `Could not acquire lock for member update: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    try {
      const members = await readMembers();
      const index = members.findIndex((m) => m.id === id);

      if (index === -1) {
        throw new MemberNotFoundError(`Member with id ${id}`);
      }

      const existingMember = members[index];

      if (updates.email) {
        const normalizedEmail = normalizeEmail(updates.email);
        const existingByEmail = members.find(
          (m) => m.id !== id && normalizeEmail(m.email) === normalizedEmail
        );
        if (existingByEmail) {
          throw new DuplicateEmailError(`Email ${updates.email} is already registered`);
        }
        updates.email = normalizedEmail;
      }

      if (updates.memberNumber) {
        const existingByNumber = members.find(
          (m) => m.id !== id && m.memberNumber === updates.memberNumber
        );
        if (existingByNumber) {
          throw new DuplicateMemberNumberError(
            `Member number ${updates.memberNumber} already exists`
          );
        }
      }

      const updatedMember: Member = {
        ...existingMember,
        ...updates,
        lastModified: new Date().toISOString(),
      };

      members[index] = updatedMember;
      await writeMembers(members);
      invalidateMemberCaches(
        existingMember,
        updatedMember,
        updates.isActive !== undefined && existingMember.isActive !== updates.isActive
      );
      return updatedMember;
    } finally {
      if (release) {
        await release();
      }
    }
  }

  async delete(id: string): Promise<boolean> {
    const prisma = getPrismaClient();

    if (prisma) {
      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) {
        return false;
      }

      const existingMember = mapPrismaMember(existing);
      const updated = await prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      invalidateMemberCaches(existingMember, mapPrismaMember(updated), existing.isActive !== false);
      return true;
    }

    const lock = new FileLock(getMembersFile());
    let release: (() => Promise<void>) | null = null;

    try {
      release = await lock.acquire();
    } catch (error) {
      throw new MemberLockError(
        `Could not acquire lock for member deletion: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    try {
      const members = await readMembers();
      const index = members.findIndex((m) => m.id === id);

      if (index === -1) {
        return false;
      }

      const member = members[index];
      members[index].isActive = false;
      members[index].lastModified = new Date().toISOString();
      await writeMembers(members);
      invalidateMemberCaches(member, members[index], true);
      return true;
    } finally {
      if (release) {
        await release();
      }
    }
  }
}

export const memberRepository: IMemberRepository = new FileMemberRepository();
