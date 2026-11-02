const { z } = require('zod');
const { bloodTypes } = require('../models/shared');
const text = (max = 200) => z.string().trim().max(max);
const requiredText = (max = 200) => text(max).min(1);
const bloodType = z.enum(bloodTypes);
const latitude = z.number().min(-90).max(90);
const longitude = z.number().min(-180).max(180);
const date = z.string().datetime({ offset: true });
const dob = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').refine(v => {
  const parsed = new Date(v);
  return !Number.isNaN(+parsed) && parsed.toISOString().slice(0, 10) === v && parsed <= new Date();
}, 'Provide a valid past date of birth');
const password = z.string().min(8).max(72).refine(v => Buffer.byteLength(v) <= 72, 'Password must be at most 72 UTF-8 bytes');
const credentials = { email: z.string().trim().toLowerCase().email().max(254), password };
const list = z.array(requiredText(200)).max(30);
const medicalHistory = z.object({
  conditions: list.optional(), medications: list.optional(), allergies: list.optional(),
  surgeries: list.optional(), notes: text(2000).optional()
}).strict();
const donorFields = {
  name: requiredText(120), bloodType, dob, address: text(500).optional(), phone: text(30).optional(),
  healthProblems: text(2000).optional(), medicalHistory: medicalHistory.optional(), knownAbnormalities: list.optional(),
  shareMedicalHistory: z.boolean().optional(), availableForSOS: z.boolean().optional(),
  latitude: latitude.optional(), longitude: longitude.optional()
};
const coordinatePair = data => (data.latitude === undefined) === (data.longitude === undefined);
const donorRegistration = z.object({ ...donorFields, ...credentials }).strict().refine(coordinatePair, 'Supply both latitude and longitude');
const donorUpdate = z.object(donorFields).partial().strict().refine(coordinatePair, 'Supply both latitude and longitude');
const orgRegistration = z.object({
  name: requiredText(120), ...credentials, role: z.enum(['hospital', 'ngo']),
  registrationNumber: requiredText(100), licenseInfo: text(2000).optional(),
  address: requiredText(500), latitude, longitude
}).strict();
const login = z.object({
  email: credentials.email, password: z.string().min(1).max(200),
  accountType: z.enum(['donor', 'hospital-ngo', 'admin']).default('donor')
}).strict();
const inventory = z.object(Object.fromEntries(bloodTypes.map(t => [t, z.number().int().min(0).max(100000).optional()]))).strict().refine(v => Object.keys(v).length > 0, 'Provide at least one blood type');
const camp = z.object({
  title: requiredText(160), date, endDate: date, timeString: text(200).optional(), address: requiredText(500),
  latitude, longitude, demands: z.array(z.enum([...bloodTypes, 'All', 'All Types Accepted'])).min(1).max(8).default(['All']),
  capacity: z.number().int().min(1).max(1000).default(100),
  slots: z.array(requiredText(80)).min(1).max(24).refine(v => new Set(v).size === v.length, 'Slot names must be unique').default(['09:00-10:00', '10:00-11:00', '11:00-12:00']),
  organizerId: text().optional(), organizerName: text().optional(), organizerRole: text().optional()
}).strict();
const record = z.object({
  donorBLId: requiredText(50), campId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  isDonation: z.boolean().default(false), isCampAttendance: z.boolean().default(false), isEndorsement: z.boolean().default(false),
  screeningStatus: z.enum(['Passed', 'Deferred']),
  bloodTypeCollected: bloodType.optional(), quantityMl: z.number().int().min(1).max(1000).optional(),
  donationType: z.enum(['Whole Blood', 'Plasma', 'Platelets', 'Event Attendance Only']).default('Whole Blood'),
  hemoglobin: z.number().min(0).max(30).optional(), bloodPressure: text(30).optional(),
  attendingStaff: requiredText(120), collectionCenter: text(500).optional(),
  facilityId: text().optional(), facilityName: text().optional(), facilityType: text().optional(), dateString: text().optional()
}).strict();
const sos = z.object({
  targetBloodType: bloodType, requiredQuantity: z.number().int().min(1).max(1000),
  urgencyLevel: z.enum(['Critical (24h)', 'Urgent', 'Standard']).default('Critical (24h)'),
  radiusKm: z.number().min(1).max(200).default(50),
  expiresInHours: z.number().int().min(1).max(72).default(24),
  hospitalId: text().optional(), hospitalName: text().optional(), latitude: latitude.optional(), longitude: longitude.optional(),
  targetHospitalId: z.string().regex(/^[a-f\d]{24}$/i).optional()
}).strict();
const reward = z.object({
  title: requiredText(160), provider: requiredText(160), costCoins: z.number().int().min(1).max(100000),
  stock: z.number().int().min(0).max(100000), image: z.string().url().max(2000).or(z.literal('')).default(''),
  isActive: z.boolean().default(true)
}).strict();
module.exports = { z, text, requiredText, password, donorRegistration, donorUpdate, orgRegistration, login, inventory, camp, record, sos, reward, bloodType };
