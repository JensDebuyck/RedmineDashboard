import { TestBed } from '@angular/core/testing';

import { MyTicketsService } from './my-tickets';

describe('MyTicketsService', () => {
  let service: MyTicketsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MyTicketsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
