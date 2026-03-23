import { BillingPeriod as PrismaBillingPeriod, MembershipStatus as PrismaMembershipStatus } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";

import { Membership } from "../../types/membership";
import { FileLock } from "../utils/file-lock";
import { ensurePrismaMember } from "../db/prisma-legacy-sync";
import { getPrismaClient } from "../db/prisma-client";

function getDataDir(): string {
  return process.env.DATA_DIR
    ? path.isAbsolute(process.env.DATA_DIR)
      ? process.env.DATA_DIR
      : path.join(process.cwd(), process.env.DATA_DIR)
    : path.join(process.cwd(), "data");
}

function getMembershipsFile(): string {
  return path.join(getDataDir(), "memberships.json");
}

function mapBillingPeriod(period: PrismaBillingPeriod): Membership["billingPeriod"] {
  switch (period) {
    case PrismaBillingPeriod.MONTHLY:
      return "monthly";
    case PrismaBillingPeriod.QUARTERLY:
      return "quarterly";
    case PrismaBillingPeriod.YEARLY:
      return "yearly";
    default:
      return "custom";
  }
}

function toBillingPeriod(period: Membership["billingPeriod"]): PrismaBillingPeriod {
  switch (period) {
    case "monthly":
      return PrismaBillingPeriod.MONTHLY;
    case "quarterly":
      return PrismaBillingPeriod.QUARTERLY;
    case "yearly":
      return PrismaBillingPeriod.YEARLY;
    default:
      return PrismaBillingPeriod.CUSTOM;
  }
}

function mapMembershipStatus(status: PrismaMembershipStatus): Membership["status"] {
  switch (status) {
    case PrismaMembershipStatus.PAUSED:
      return "paused";
    case PrismaMembershipStatus.CANCELLED:
      return "cancelled";
    case PrismaMembershipStatus.EXPIRED:
      return "expired";
    default:
      return "active";
  }
}

function toMembershipStatus(status: Membership["status"]): PrismaMembershipStatus {
  switch (status) {
    case "paused":
      return PrismaMembershipStatus.PAUSED;
    case "cancelled":
      return PrismaMembershipStatus.CANCELLED;
    case "expired":
      return PrismaMembershipStatus.EXPIRED;
    default:
      return PrismaMembershipStatus.ACTIVE;
  }
}

function mapPrismaMembership(membership: {
  id: string;
  userId: string;
  planName: string;
  billingPeriod: PrismaBillingPeriod;
  priceCents: number;
  status: PrismaMembershipStatus;
  startsOn: string;
  endsOn: string | null;
  notes: string | null;
  paymentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Membership {
  return {
    id: membership.id,
    memberId: membership.userId,
    planName: membership.planName,
    billingPeriod: mapBillingPeriod(membership.billingPeriod),
    price: membership.priceCents,
    status: mapMembershipStatus(membership.status),
    startsOn: membership.startsOn,
    endsOn: membership.endsOn || undefined,
    notes: membership.notes || undefined,
    paymentId: membership.paymentId || undefined,
    createdAt: membership.createdAt.toISOString(),
    lastModified: membership.updatedAt.toISOString(),
  };
}

async function ensureDataFiles(): Promise<void> {
  const dataDir = getDataDir();
  const membershipsFile = getMembershipsFile();
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(membershipsFile);
  } catch {
    await fs.writeFile(membershipsFile, JSON.stringify([], null, 2));
  }
}

async function readMemberships(): Promise<Membership[]> {
  await ensureDataFiles();

  try {
    const data = await fs.readFile(getMembershipsFile(), "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading memberships:", error);
    return [];
  }
}

async function writeMemberships(memberships: Membership[]): Promise<void> {
  await ensureDataFiles();
  await fs.writeFile(getMembershipsFile(), JSON.stringify(memberships, null, 2));
}

export class FileMembershipRepository {
  async findAll(): Promise<Membership[]> {
    const prisma = getPrismaClient();

    if (prisma) {
      const memberships = await prisma.membership.findMany({
        orderBy: { createdAt: "desc" },
      });

      return memberships.map(mapPrismaMembership);
    }

    const memberships = await readMemberships();
    return memberships.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async findById(id: string): Promise<Membership | null> {
    const prisma = getPrismaClient();

    if (prisma) {
      const membership = await prisma.membership.findUnique({ where: { id } });
      return membership ? mapPrismaMembership(membership) : null;
    }

    const memberships = await readMemberships();
    return memberships.find((membership) => membership.id === id) || null;
  }

  async findByMemberId(memberId: string): Promise<Membership[]> {
    const prisma = getPrismaClient();

    if (prisma) {
      const memberships = await prisma.membership.findMany({
        where: { userId: memberId },
        orderBy: { createdAt: "desc" },
      });

      return memberships.map(mapPrismaMembership);
    }

    const memberships = await readMemberships();
    return memberships.filter((membership) => membership.memberId === memberId);
  }

  async create(
    membershipData: Omit<Membership, "id" | "createdAt" | "lastModified">
  ): Promise<Membership> {
    const prisma = getPrismaClient();

    if (prisma) {
      await ensurePrismaMember(membershipData.memberId);

      const user = await prisma.user.findUnique({
        where: { id: membershipData.memberId },
        select: { id: true },
      });

      if (!user) {
        throw new Error(`Membership member ${membershipData.memberId} not found in Prisma runtime`);
      }

      const membership = await prisma.membership.create({
        data: {
          userId: membershipData.memberId,
          planName: membershipData.planName,
          billingPeriod: toBillingPeriod(membershipData.billingPeriod),
          priceCents: membershipData.price,
          status: toMembershipStatus(membershipData.status),
          startsOn: membershipData.startsOn,
          endsOn: membershipData.endsOn,
          notes: membershipData.notes,
          paymentId: membershipData.paymentId,
        },
      });

      return mapPrismaMembership(membership);
    }

    const lock = new FileLock(getMembershipsFile());
    const release = await lock.acquire();

    try {
      const memberships = await readMemberships();
      const now = new Date().toISOString();
      const membership: Membership = {
        ...membershipData,
        id: `membership-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: now,
        lastModified: now,
      };

      memberships.push(membership);
      await writeMemberships(memberships);
      return membership;
    } finally {
      await release();
    }
  }

  async update(id: string, updates: Partial<Membership>): Promise<Membership> {
    const prisma = getPrismaClient();

    if (prisma) {
      const existing = await prisma.membership.findUnique({ where: { id } });

      if (!existing) {
        throw new Error(`Membership ${id} not found`);
      }

      const memberId = updates.memberId !== undefined ? updates.memberId : existing.userId;
      await ensurePrismaMember(memberId);

      const user = await prisma.user.findUnique({
        where: { id: memberId },
        select: { id: true },
      });

      if (!user) {
        throw new Error(`Membership member ${memberId} not found in Prisma runtime`);
      }

      const updatedMembership = await prisma.membership.update({
        where: { id },
        data: {
          userId: memberId,
          planName: updates.planName !== undefined ? updates.planName : existing.planName,
          billingPeriod: updates.billingPeriod
            ? toBillingPeriod(updates.billingPeriod)
            : existing.billingPeriod,
          priceCents: updates.price !== undefined ? updates.price : existing.priceCents,
          status: updates.status ? toMembershipStatus(updates.status) : existing.status,
          startsOn: updates.startsOn !== undefined ? updates.startsOn : existing.startsOn,
          endsOn: updates.endsOn !== undefined ? updates.endsOn : existing.endsOn,
          notes: updates.notes !== undefined ? updates.notes : existing.notes,
          paymentId: updates.paymentId !== undefined ? updates.paymentId : existing.paymentId,
          updatedAt: new Date(),
        },
      });

      return mapPrismaMembership(updatedMembership);
    }

    const lock = new FileLock(getMembershipsFile());
    const release = await lock.acquire();

    try {
      const memberships = await readMemberships();
      const index = memberships.findIndex((membership) => membership.id === id);

      if (index === -1) {
        throw new Error(`Membership ${id} not found`);
      }

      const updatedMembership: Membership = {
        ...memberships[index],
        ...updates,
        id,
        lastModified: new Date().toISOString(),
      };

      memberships[index] = updatedMembership;
      await writeMemberships(memberships);
      return updatedMembership;
    } finally {
      await release();
    }
  }
}

export const membershipRepository = new FileMembershipRepository();
