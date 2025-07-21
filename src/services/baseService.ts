// src/services/baseService.ts
import { Model, FindOptions, CreateOptions, UpdateOptions, DestroyOptions } from 'sequelize';

/**
 * Generic BaseService for common CRUD operations.
 * @template T The Model type (e.g., Video).
 * @template C The type for creation attributes (optional, if different from model attributes).
 */
export class BaseService<T extends Model, C = T> {
    protected model: new () => T & { prototype: T }; // Correctly type the Model constructor

    constructor(model: new () => T & { prototype: T }) {
        this.model = model;
    }

    /**
     * Creates a new record.
     * @param data The data for the new record.
     * @param options Sequelize create options.
     * @returns The created model instance.
     */
    async create(data: C, options?: CreateOptions<any>): Promise<T> {
        return (this.model as any).create(data, options);
    }

    /**
     * Finds a record by its primary key.
     * @param id The primary key of the record.
     * @param options Sequelize find options.
     * @returns The found model instance, or null if not found.
     */
    async findById(id: number, options?: FindOptions<any>): Promise<T | null> {
        return (this.model as any).findByPk(id, options);
    }

    /**
     * Finds a single record based on provided options.
     * @param options Sequelize find options.
     * @returns The found model instance, or null if not found.
     */
    async findOne(options?: FindOptions<any>): Promise<T | null> {
        return (this.model as any).findOne(options);
    }

    /**
     * Finds all records based on provided options.
     * @param options Sequelize find options.
     * @returns An array of found model instances.
     */
    async findAll(options?: FindOptions<any>): Promise<T[]> {
        return (this.model as any).findAll(options);
    }

    /**
     * Updates a record.
     * @param id The primary key of the record to update.
     * @param data The data to update.
     * @param options Sequelize update options.
     * @returns The number of affected rows.
     */
    async update(id: number, data: Partial<C>, options?: UpdateOptions<any>): Promise<[number, T[]]> {
        const [affectedCount, affectedRows] = await (this.model as any).update(data, {
            where: { id: id },
            returning: true, // Return the updated rows
            ...options,
        });
        return [affectedCount, affectedRows];
    }

    /**
     * Deletes a record by its primary key.
     * @param id The primary key of the record to delete.
     * @param options Sequelize destroy options.
     * @returns The number of destroyed rows.
     */
    async delete(id: number, options?: DestroyOptions<any>): Promise<number> {
        return (this.model as any).destroy({
            where: { id: id },
            ...options,
        });
    }
}
