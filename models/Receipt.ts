export interface Receipt {
  id: string;
  date: string;
  storeId: string;
  amount: number;
  items: string[]; // Item IDs
  paidFullAmount: boolean;
}
