import { getMember } from "./members";
import { Membership, MembershipRequest } from "../types/membership";
import { membershipRepository } from "./repositories/file-membership-repository";
import { paymentRepository } from "./repositories/file-payment-repository";
import { ValidationError } from "./errors/reservation-errors";
import { Payment } from "../types/payment";

export async function listMemberships(): Promise<Membership[]> {
  return membershipRepository.findAll();
}

export async function createMembership(data: MembershipRequest): Promise<Membership> {
  if (!data.memberId || !data.planName || !data.billingPeriod || !data.startsOn || data.price <= 0) {
    throw new ValidationError("Missing required membership fields");
  }

  await getMember(data.memberId);

  const payment = await paymentRepository.create({
    memberId: data.memberId,
    type: "membership",
    amount: data.price,
    currency: "usd",
    status: "paid",
    description: `Membership: ${data.planName}`,
    metadata: {
      planName: data.planName,
      billingPeriod: data.billingPeriod,
    },
    paidAt: new Date().toISOString(),
  } as Omit<Payment, "id" | "createdAt" | "lastModified">);

  return membershipRepository.create({
    memberId: data.memberId,
    planName: data.planName,
    billingPeriod: data.billingPeriod,
    price: data.price,
    status: "active",
    startsOn: data.startsOn,
    endsOn: data.endsOn,
    notes: data.notes,
    paymentId: payment.id,
  });
}
