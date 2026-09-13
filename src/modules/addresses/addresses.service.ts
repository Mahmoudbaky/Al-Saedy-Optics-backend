import { db } from "../../db/index.js";
import { NotFoundError } from "../../lib/errors.js";
import { addressesRepository, type AddressRow } from "./addresses.repository.js";
import type { AddressDto, CreateAddressInput, UpdateAddressInput } from "./addresses.schema.js";

export function formatAddress(a: { city: string; area: string; street?: string | null; building?: string | null }): string {
  const parts = [a.area, a.street, a.building].filter(Boolean);
  return parts.length ? `${a.city} · ${parts.join(", ")}` : a.city;
}

export const toAddressDto = (row: AddressRow): AddressDto => ({
  id: row.id,
  label: row.label,
  recipientName: row.recipientName,
  phone: row.phone,
  city: row.city,
  area: row.area,
  street: row.street,
  building: row.building,
  notes: row.notes,
  isDefault: row.isDefault,
  formatted: formatAddress(row),
});

export const addressesService = {
  async list(userId: string) {
    return (await addressesRepository.listByUser(userId)).map(toAddressDto);
  },

  async getOwned(userId: string, id: string) {
    const row = await addressesRepository.findOwned(userId, id);
    if (!row) throw new NotFoundError("Address", id);
    return row;
  },

  async create(userId: string, input: CreateAddressInput) {
    const row = await db.transaction(async (tx) => {
      const existing = await addressesRepository.listByUser(userId, tx);
      const makeDefault = input.isDefault || existing.length === 0;
      if (makeDefault) await addressesRepository.clearDefault(userId, tx);
      return addressesRepository.create({ ...input, userId, isDefault: makeDefault }, tx);
    });
    return toAddressDto(row);
  },

  async update(userId: string, id: string, input: UpdateAddressInput) {
    await this.getOwned(userId, id);
    const row = await db.transaction(async (tx) => {
      if (input.isDefault) await addressesRepository.clearDefault(userId, tx);
      return addressesRepository.update(id, input, tx);
    });
    return toAddressDto(row!);
  },

  async setDefault(userId: string, id: string) {
    return this.update(userId, id, { isDefault: true });
  },

  async delete(userId: string, id: string) {
    const row = await this.getOwned(userId, id);
    await db.transaction(async (tx) => {
      await addressesRepository.delete(id, tx);
      if (row.isDefault) {
        const [next] = await addressesRepository.listByUser(userId, tx);
        if (next) await addressesRepository.update(next.id, { isDefault: true }, tx);
      }
    });
  },
};
