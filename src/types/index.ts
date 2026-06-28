export interface Company {
  id: string;
  name: string;
  taxId: string;
  createdAt: Date;
}

export interface Bank {
  id: string;
  companyId: string;
  bankName: string;
  accountNumber: string;
  accountType: 'current' | 'overdraft';
  branchName: string;
  routingNumber: string;
  balance: number;
  logoUrl?: string;
  createdAt: Date;
}

export interface Vendor {
  id: string;
  companyId: string;
  name: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  createdAt: Date;
}

export type ChequeStatus = 'available' | 'draft' | 'issued' | 'cleared' | 'bounced' | 'cancelled' | 'void';

export interface ChequeBook {
  id: string;
  bankId: string;
  companyId: string;
  startSerial: string;
  endSerial: string;
  currentSerial: string;
  prefix?: string;
  createdAt: Date;
}

export interface Cheque {
  id: string;
  companyId: string;
  bankId: string;
  vendorId: string;
  amount: number;
  chequeNumber: string;
  chequeDate: Date;
  issueDate: Date;
  status: ChequeStatus;
  clearedDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  companyId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, any>;
  timestamp: Date;
}
