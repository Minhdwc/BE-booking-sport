import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAmenityDto, UpdateAmenityDto } from './amenities.dto';
import { AmenitiesRepository } from './amenities.repository';

@Injectable()
export class AmenitiesService {
  constructor(private readonly repository: AmenitiesRepository) {}

  findAll() {
    return this.repository.findAll();
  }

  findAllVenueAmenities(venueId: string) {
    return this.repository.findAllVenueAmenities(venueId);
  }

  async findOne(id: string) {
    const amenity = await this.repository.findById(id);
    if (!amenity) {
      throw new NotFoundException('Tiện ích không tồn tại');
    }
    return amenity;
  }

  create(dto: CreateAmenityDto) {
    return this.repository.create({
      name: dto.name,
      description: dto.description,
    });
  }

  async update(id: string, dto: UpdateAmenityDto) {
    await this.findOne(id);
    return this.repository.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.repository.delete(id);
  }
}
