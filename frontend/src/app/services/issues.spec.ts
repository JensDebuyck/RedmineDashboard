import { TestBed } from '@angular/core/testing';

import { IssueService } from './issues';

describe('IssueService', () => {
  let service: IssueService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IssueService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
