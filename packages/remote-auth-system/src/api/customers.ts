export interface Customer {
  id: number;
  companyName: string;
  gstNumber: string;
  planType: 'Subscription' | 'Pay as you use' | 'Support Team';
  activeSince: string;
  status: 'Active' | 'Paid' | 'Due';
}

export const dummyCustomers: Customer[] = [
  {
    id: 1,
    companyName: "Company A",
    gstNumber: "29ABCDE1234",
    planType: "Subscription",
    activeSince: "Jan 2025",
    status: "Active",
  },
  {
    id: 2,
    companyName: "Company B",
    gstNumber: "07AABCU9603",
    planType: "Pay as you use",
    activeSince: "Mar 2024",
    status: "Paid",
  },
  {
    id: 3,
    companyName: "Company C",
    gstNumber: "33AAJCM1234",
    planType: "Pay as you use",
    activeSince: "Jan 2025",
    status: "Paid",
  },
  {
    id: 4,
    companyName: "Company D",
    gstNumber: "27AAAPL1234",
    planType: "Subscription",
    activeSince: "Jan 2025",
    status: "Paid",
  },
  {
    id: 5,
    companyName: "Company X",
    gstNumber: "24AACCM9910",
    planType: "Subscription",
    activeSince: "Feb 2024",
    status: "Due",
  },
  {
    id: 6,
    companyName: "Company Y",
    gstNumber: "19AABCT1234",
    planType: "Support Team",
    activeSince: "May 2025",
    status: "Active",
  },
  {
    id: 7,
    companyName: "Company Z",
    gstNumber: "06AADCR5678",
    planType: "Subscription",
    activeSince: "Apr 2025",
    status: "Active",
  },
];
