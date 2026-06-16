import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../../guards/roles.guard';
import { CreateFieldDto, UpdateFieldDto } from './field.dto';
import { FieldService } from './field.service';

@Controller('fields')
export class FieldController {
  constructor(private readonly fieldService: FieldService) {}

  @Get()
  getFields() {
    return this.fieldService.getFields();
  }

  @Get(':id')
  getFieldById(@Param('id') id: string) {
    return this.fieldService.getFieldById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  createField(@Body() body: CreateFieldDto) {
    return this.fieldService.createField(body);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  updateField(@Param('id') id: string, @Body() body: UpdateFieldDto) {
    return this.fieldService.updateField(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  deleteField(@Param('id') id: string) {
    return this.fieldService.deleteField(id);
  }
}
