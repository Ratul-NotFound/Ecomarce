// src/lib/utils/bangladesh-districts.ts
// All 64 districts of Bangladesh with shipping zone classification.

export const DISTRICTS = [
  'Bagerhat', 'Bandarban', 'Barguna', 'Barishal', 'Bhola',
  'Bogura', 'Brahmanbaria', 'Chandpur', 'Chattogram', 'Chuadanga',
  "Cox's Bazar", 'Cumilla', 'Dhaka', 'Dinajpur', 'Faridpur',
  'Feni', 'Gaibandha', 'Gazipur', 'Gopalganj', 'Habiganj',
  'Jamalpur', 'Jashore', 'Jhalokati', 'Jhenaidah', 'Joypurhat',
  'Khagrachhari', 'Khulna', 'Kishoreganj', 'Kurigram', 'Kushtia',
  'Lakshmipur', 'Lalmonirhat', 'Madaripur', 'Magura', 'Manikganj',
  'Meherpur', 'Moulvibazar', 'Munshiganj', 'Mymensingh', 'Naogaon',
  'Narail', 'Narayanganj', 'Narsingdi', 'Natore', 'Nawabganj',
  'Netrokona', 'Nilphamari', 'Noakhali', 'Pabna', 'Panchagarh',
  'Patuakhali', 'Pirojpur', 'Rajbari', 'Rajshahi', 'Rangamati',
  'Rangpur', 'Satkhira', 'Shariatpur', 'Sherpur', 'Sirajganj',
  'Sunamganj', 'Sylhet', 'Tangail', 'Thakurgaon',
] as const;

export type District = (typeof DISTRICTS)[number];

// Districts considered "inside Dhaka" zone for shipping
const DHAKA_ZONE: string[] = [
  'Dhaka', 'Gazipur', 'Narayanganj', 'Manikganj', 'Munshiganj', 'Narsingdi',
];

/**
 * Returns shipping fee in BDT based on district.
 * Defaults to 60 BDT for Dhaka zone, 120 BDT outside Dhaka zone,
 * or dynamically provided rates configured by the store administrator.
 */
export function getShippingFee(
  district: string,
  insideFee: number = 60,
  outsideFee: number = 120
): number {
  return DHAKA_ZONE.includes(district) ? insideFee : outsideFee;
}

/**
 * Returns true if the district qualifies for the lower Dhaka shipping rate
 */
export function isInsideDhaka(district: string): boolean {
  return DHAKA_ZONE.includes(district);
}

/**
 * All districts as an array of { value, label } for dropdowns
 */
export const DISTRICT_OPTIONS = DISTRICTS.map(d => ({ value: d, label: d }));
