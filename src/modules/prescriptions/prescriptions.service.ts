import { eq } from "drizzle-orm";
import { createLogger } from "../../config/logger.js";
import { prescriptions } from "../../db/schema/index.js";
import { BadRequestError, NotFoundError } from "../../lib/errors.js";
import { pageMeta } from "../../lib/pagination.js";
import { prescriptionsRepository, type NewPrescription, type PrescriptionRow } from "./prescriptions.repository.js";
import type {
  AdminListPrescriptionsQuery,
  CreatePrescriptionInput,
  PrescriptionDto,
  ReviewPrescriptionInput,
  UpdatePrescriptionInput,
} from "./prescriptions.schema.js";

const log = createLogger("prescriptions");
const VALIDITY_MONTHS = 12;

const nn = (v: string | null | undefined) => (v ? v : null);

export const toPrescriptionDto = (row: PrescriptionRow): PrescriptionDto => ({
  id: row.id,
  userId: row.userId,
  label: row.label,
  doctorName: row.doctorName,
  issuedOn: row.issuedOn,
  expiresOn: row.expiresOn,
  source: row.source,
  status: row.status,
  od: { sph: row.odSph, cyl: row.odCyl, axis: row.odAxis },
  os: { sph: row.osSph, cyl: row.osCyl, axis: row.osAxis },
  pd: row.pd,
  add: row.addPower,
  imageUrl: row.imageUrl,
  reviewNote: row.reviewNote,
  createdAt: row.createdAt.toISOString(),
});

function eyeColumns(input: Pick<UpdatePrescriptionInput, "od" | "os" | "pd" | "add">): Partial<NewPrescription> {
  return {
    ...(input.od ? { odSph: nn(input.od.sph), odCyl: nn(input.od.cyl), odAxis: nn(input.od.axis) } : {}),
    ...(input.os ? { osSph: nn(input.os.sph), osCyl: nn(input.os.cyl), osAxis: nn(input.os.axis) } : {}),
    ...(input.pd !== undefined ? { pd: nn(input.pd) } : {}),
    ...(input.add !== undefined ? { addPower: nn(input.add) } : {}),
  };
}

function defaultExpiry(issuedOn: string | null | undefined): string | null {
  if (!issuedOn) return null;
  const d = new Date(issuedOn);
  d.setMonth(d.getMonth() + VALIDITY_MONTHS);
  return d.toISOString().slice(0, 10);
}

export const prescriptionsService = {
  async list(userId: string) {
    return (await prescriptionsRepository.listByUser(userId)).map(toPrescriptionDto);
  },

  async getOwned(userId: string, id: string) {
    const row = await prescriptionsRepository.findOwned(userId, id);
    if (!row) throw new NotFoundError("Prescription", id);
    return row;
  },

  /** Verified & not expired – the only kind that can be attached to an order. */
  async getUsable(userId: string, id: string) {
    const row = await this.getOwned(userId, id);
    if (row.status !== "verified") throw new BadRequestError("Prescription has not been verified yet");
    if (row.expiresOn && new Date(row.expiresOn) < new Date()) throw new BadRequestError("Prescription has expired");
    return row;
  },

  async create(userId: string, input: CreatePrescriptionInput) {
    const row = await prescriptionsRepository.create({
      userId,
      label: input.label ?? null,
      doctorName: input.doctorName ?? null,
      issuedOn: input.issuedOn ?? null,
      expiresOn: defaultExpiry(input.issuedOn),
      source: input.source,
      status: "pending",
      imageUrl: input.imageUrl ?? null,
      ...eyeColumns(input),
    });
    log.info({ id: row.id, userId, source: row.source }, "Prescription submitted");
    return toPrescriptionDto(row);
  },

  async update(userId: string, id: string, input: UpdatePrescriptionInput) {
    const existing = await this.getOwned(userId, id);
    if (existing.status === "verified") throw new BadRequestError("Verified prescriptions can't be edited – add a new one instead");
    const row = await prescriptionsRepository.update(id, {
      ...(input.label !== undefined ? { label: input.label } : {}),
      ...(input.doctorName !== undefined ? { doctorName: input.doctorName } : {}),
      ...(input.issuedOn !== undefined ? { issuedOn: input.issuedOn, expiresOn: defaultExpiry(input.issuedOn) } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...eyeColumns(input),
      status: "pending",
    });
    return toPrescriptionDto(row!);
  },

  async delete(userId: string, id: string) {
    await this.getOwned(userId, id);
    await prescriptionsRepository.delete(id);
  },

  // ---- admin ---------------------------------------------------------------
  async adminList(query: AdminListPrescriptionsQuery) {
    const filters = [];
    if (query.status) filters.push(eq(prescriptions.status, query.status));
    if (query.userId) filters.push(eq(prescriptions.userId, query.userId));
    const { rows, total } = await prescriptionsRepository.list(filters, query);
    return {
      items: rows.map((r) => ({ ...toPrescriptionDto(r), user: r.user })),
      meta: pageMeta(total, query),
    };
  },

  async review(id: string, input: ReviewPrescriptionInput) {
    const existing = await prescriptionsRepository.findById(id);
    if (!existing) throw new NotFoundError("Prescription", id);
    const row = await prescriptionsRepository.update(id, {
      status: input.status,
      reviewNote: input.reviewNote ?? null,
      ...(input.expiresOn !== undefined ? { expiresOn: input.expiresOn } : {}),
      ...(input.status === "verified" && !existing.expiresOn && input.expiresOn === undefined
        ? { expiresOn: defaultExpiry(new Date().toISOString().slice(0, 10)) }
        : {}),
      ...eyeColumns(input),
    });
    log.info({ id, status: input.status }, "Prescription reviewed");
    return toPrescriptionDto(row!);
  },
};
