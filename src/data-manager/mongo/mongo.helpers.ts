import * as mongoDB from 'mongodb';
import { Log } from '../../logger/logger-manager'

/**
 * Safely converts a string to a MongoDB `ObjectId`.
 *
 * This function attempts to create an `ObjectId` from a given string `id`.
 * If the conversion fails, it logs an error indicating an invalid format
 * and returns `null` instead of throwing an exception.
 *
 * @param id - The string to convert into a MongoDB `ObjectId`.
 *
 * @returns The created `ObjectId` if the conversion is successful;
 * otherwise, returns `null` if the `id` format is invalid.
 */
export const toObjectId = (id: string | null | undefined): mongoDB.ObjectId | null => {
  if (!id || typeof id !== 'string') {
    Log.error(`Invalid ObjectId format: ${id}`);
    return null;
  }

  try {
    return new mongoDB.ObjectId(id);
  } catch {
    Log.error(`Invalid ObjectId format: ${id}`);
    return null;
  }
};
