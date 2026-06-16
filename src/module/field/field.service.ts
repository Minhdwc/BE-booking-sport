import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { fieldsTable } from '../../db/schema';
import { CreateFieldDto, UpdateFieldDto } from './field.dto';

@Injectable()
export class FieldService {
  async getFields() {
    const fields = await db.select().from(fieldsTable);
    return { message: 'Fields fetched', data: fields };
  }

  async getFieldById(id: string) {
    const fields = await db.select().from(fieldsTable).where(eq(fieldsTable.id, id));
    if (fields.length === 0) {
      throw new HttpException('Field not found', HttpStatus.NOT_FOUND);
    }
    return { message: 'Field fetched', data: fields[0] };
  }

  async createField(values: CreateFieldDto) {
    const [field] = await db.insert(fieldsTable).values(values).returning();
    return { message: 'Field created', data: field };
  }

  async updateField(id: string, values: UpdateFieldDto) {
    await this.getFieldById(id);
    const [field] = await db
      .update(fieldsTable)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(fieldsTable.id, id))
      .returning();
    return { message: 'Field updated', data: field };
  }

  async deleteField(id: string) {
    await this.getFieldById(id);
    await db.delete(fieldsTable).where(eq(fieldsTable.id, id));
    return { message: 'Field deleted' };
  }
}
