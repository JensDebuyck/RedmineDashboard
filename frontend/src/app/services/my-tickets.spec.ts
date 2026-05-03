import { TestBed } from '@angular/core/testing';

import { MyTickets } from './my-tickets';

describe('MyTickets', () => {
  let service: MyTickets;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MyTickets);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
