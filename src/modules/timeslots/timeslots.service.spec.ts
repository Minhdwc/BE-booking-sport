import { ConflictException } from '@nestjs/common';
import { TimeslotsRepository } from './timeslots.repository';
import { TimeslotsService } from './timeslots.service';

describe('TimeslotsService', () => {
  const timeslot = {
    id: 'timeslot-1',
    startTime: new Date('1970-01-01T08:00:00.000Z'),
    endTime: new Date('1970-01-01T09:00:00.000Z'),
    createdAt: new Date(),
  };
  let repository: jest.Mocked<TimeslotsRepository>;
  let service: TimeslotsService;

  beforeEach(() => {
    repository = {
      findById: jest.fn().mockResolvedValue(timeslot),
      countBookings: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<TimeslotsRepository>;
    service = new TimeslotsService(repository);
  });

  it('rejects deleting a timeslot referenced by a booking', async () => {
    repository.countBookings.mockResolvedValue(1);

    await expect(service.remove(timeslot.id)).rejects.toBeInstanceOf(ConflictException);
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('deletes an unused timeslot', async () => {
    repository.countBookings.mockResolvedValue(0);
    repository.delete.mockResolvedValue(timeslot);

    await expect(service.remove(timeslot.id)).resolves.toEqual(timeslot);
    expect(repository.delete).toHaveBeenCalledWith(timeslot.id);
  });
});
