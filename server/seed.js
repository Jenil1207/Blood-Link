const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const HospitalNGO = require('./models/HospitalNGO');
const Camp = require('./models/Camp');
const SOSAlert = require('./models/SOSAlert');
const DonationRecord = require('./models/DonationRecord');
const RewardItem = require('./models/RewardItem');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bloodlink';

async function seedDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB Atlas / Database for seeding...');

    // Clear existing collections
    await User.deleteMany({});
    await HospitalNGO.deleteMany({});
    await Camp.deleteMany({});
    await SOSAlert.deleteMany({});
    await DonationRecord.deleteMany({});
    await RewardItem.deleteMany({});

    console.log('Cleared existing collections.');

    // 1. Seed Main Donor and Additional Searchable Donors
    const mainDonor = await User.create({
      donorId: 'BL-2024-78542',
      name: 'John Doe',
      email: 'useremail@gmail.com',
      password: 'user123',
      bloodType: 'O+',
      dob: new Date('1994-03-18'),
      address: 'Bandra West, Mumbai',
      location: {
        type: 'Point',
        coordinates: [72.8347, 19.0596]
      },
      healthProblems: 'None',
      coins: 450,
      totalDonations: 8,
      badgesCount: 3,
      lastDonationDate: new Date('2025-10-14'),
      hemoglobin: 14.2,
      bloodPressure: '118/78',
      screeningStatus: 'Passed',
      verifyingInstitutions: ['XYZ Hospital', 'XYZ Blood Bank & Clinics']
    });

    const otherDonors = await User.insertMany([
      {
        donorId: 'BL-2024-91204',
        name: 'Aarav Patel',
        email: 'aarav.patel@gmail.com',
        password: 'user123',
        bloodType: 'O+',
        dob: new Date('1992-05-12'),
        address: 'Andheri East, Mumbai',
        location: { type: 'Point', coordinates: [72.8697, 19.1136] },
        coins: 600,
        totalDonations: 12,
        badgesCount: 5,
        lastDonationDate: new Date('2025-08-20'),
        hemoglobin: 15.0,
        bloodPressure: '120/80',
        screeningStatus: 'Passed',
        verifyingInstitutions: ['City General Hospital']
      },
      {
        donorId: 'BL-2024-44281',
        name: 'Priya Sharma',
        email: 'priya.sharma@gmail.com',
        password: 'user123',
        bloodType: 'O+',
        dob: new Date('1998-11-25'),
        address: 'Dadar, Mumbai',
        location: { type: 'Point', coordinates: [72.8428, 19.0178] },
        coins: 350,
        totalDonations: 4,
        badgesCount: 2,
        lastDonationDate: new Date('2025-09-10'),
        hemoglobin: 13.5,
        bloodPressure: '116/76',
        screeningStatus: 'Passed',
        verifyingInstitutions: ['XYZ Hospital']
      },
      {
        donorId: 'BL-2024-11093',
        name: 'Rohan Deshmukh',
        email: 'rohan.deshmukh@gmail.com',
        password: 'user123',
        bloodType: 'O+',
        dob: new Date('1989-02-14'),
        address: 'Thane West, Mumbai',
        location: { type: 'Point', coordinates: [72.9781, 19.2183] },
        coins: 850,
        totalDonations: 15,
        badgesCount: 6,
        lastDonationDate: new Date('2025-07-04'),
        hemoglobin: 14.8,
        bloodPressure: '122/82',
        screeningStatus: 'Passed',
        verifyingInstitutions: ['Mercy Trauma Center', 'XYZ Hospital']
      }
    ]);

    // 2. Seed Hospitals and NGOs
    const xyzHospital = await HospitalNGO.create({
      name: 'XYZ Hospital',
      email: 'xyzhospital@gmail.com',
      password: 'hospital123',
      role: 'hospital',
      registrationNumber: 'HOSP-MH-2024-001',
      licenseInfo: 'MOHFW Certified Class-A Blood Bank & Trauma Care',
      address: 'Central Medical Enclave, Mumbai',
      location: {
        type: 'Point',
        coordinates: [72.8777, 19.0760]
      },
      isVerified: true,
      inventory: {
        'O+': 24,
        'O-': 3,
        'A+': 14,
        'A-': 6,
        'B+': 18,
        'B-': 4,
        'AB+': 9,
        'AB-': 1
      }
    });

    const cityGeneral = await HospitalNGO.create({
      name: 'City General Hospital',
      email: 'citygeneral@gmail.com',
      password: 'hospital123',
      role: 'hospital',
      registrationNumber: 'HOSP-MH-2024-002',
      licenseInfo: 'State Health Board Verified',
      address: 'Shivaji Marg, Mumbai',
      location: {
        type: 'Point',
        coordinates: [72.8450, 19.0850]
      },
      isVerified: true,
      inventory: {
        'O+': 30,
        'O-': 12, // 4+ units O- surplus
        'A+': 15,
        'A-': 8,
        'B+': 20,
        'B-': 5,
        'AB+': 10,
        'AB-': 3
      }
    });

    const mercyTrauma = await HospitalNGO.create({
      name: 'Mercy Trauma Center',
      email: 'mercytrauma@gmail.com',
      password: 'hospital123',
      role: 'hospital',
      registrationNumber: 'HOSP-MH-2024-003',
      licenseInfo: 'Emergency Response Directorate Certified',
      address: 'Eastern Express Highway, Chembur, Mumbai',
      location: {
        type: 'Point',
        coordinates: [72.9000, 19.0600]
      },
      isVerified: true,
      inventory: {
        'O+': 18,
        'O-': 10, // 2+ units O- surplus
        'A+': 12,
        'A-': 4,
        'B+': 15,
        'B-': 3,
        'AB+': 6,
        'AB-': 2
      }
    });

    const redCrossNGO = await HospitalNGO.create({
      name: 'Red Cross Chapter 4',
      email: 'redcross.mumbai@gmail.com',
      password: 'ngo123',
      role: 'ngo',
      registrationNumber: 'NGO-MH-2024-555',
      licenseInfo: 'Indian Red Cross Society Affiliated',
      address: 'Colaba Causeway, Mumbai',
      location: {
        type: 'Point',
        coordinates: [72.8311, 18.9220]
      },
      isVerified: true,
      inventory: {
        'O+': 5,
        'O-': 1,
        'A+': 3,
        'A-': 2,
        'B+': 4,
        'B-': 1,
        'AB+': 2,
        'AB-': 0
      }
    });

    const lifeSourceNGO = await HospitalNGO.create({
      name: 'LifeSource Foundation',
      email: 'lifesource@gmail.com',
      password: 'ngo123',
      role: 'ngo',
      registrationNumber: 'NGO-MH-2024-777',
      licenseInfo: 'National Blood Transfusion Council Accredited',
      address: 'Navi Mumbai',
      location: {
        type: 'Point',
        coordinates: [73.0169, 19.0330]
      },
      isVerified: true,
      inventory: {
        'O+': 8,
        'O-': 2,
        'A+': 6,
        'A-': 1,
        'B+': 5,
        'B-': 2,
        'AB+': 3,
        'AB-': 1
      }
    });

    // Unverified NGO / Hospital for Admin Approval demonstration
    await HospitalNGO.create({
      name: 'Seva Samarpan Health Trust',
      email: 'sevatrust@gmail.com',
      password: 'ngo123',
      role: 'ngo',
      registrationNumber: 'NGO-MH-2026-999',
      licenseInfo: 'Charity Commissioner Reg No. E-34821',
      address: 'Ghatkopar West, Mumbai',
      location: {
        type: 'Point',
        coordinates: [72.9080, 19.0860]
      },
      isVerified: false // Needs Admin Verification!
    });

    // Scam reported institution for Admin moderation demonstration
    await HospitalNGO.create({
      name: 'Fake Blood Helpline Trust',
      email: 'fakehelpline@gmail.com',
      password: 'scam123',
      role: 'ngo',
      registrationNumber: 'FAKE-000-000',
      licenseInfo: 'Unverified unofficial',
      address: 'Unknown location',
      location: {
        type: 'Point',
        coordinates: [72.8500, 19.0500]
      },
      isVerified: true,
      isScamReported: true,
      scamReportReason: 'Charging exorbitant processing fees to patients unlawfully'
    });

    // 3. Seed Camps (matching nearby-camps.pdf)
    await Camp.create([
      {
        title: 'Metro Central Plaza Drive',
        organizerId: redCrossNGO._id,
        organizerName: 'Red Cross Chapter 4',
        organizerRole: 'ngo',
        date: new Date('2026-10-25'),
        timeString: 'Saturday, 09:00 AM',
        address: 'Metro Central Mall Concourse, Mumbai',
        location: {
          type: 'Point',
          coordinates: [72.8680, 19.0720] // ~1.2 km from center
        },
        demands: ['O+', 'A+'],
        registeredDonors: []
      },
      {
        title: 'Community Health Initiative Camp',
        organizerId: lifeSourceNGO._id,
        organizerName: 'LifeSource Foundation',
        organizerRole: 'ngo',
        date: new Date('2026-10-26'),
        timeString: 'Sunday, 10:00 AM',
        address: 'Community Center Grounds, Mumbai',
        location: {
          type: 'Point',
          coordinates: [72.8480, 19.0950] // ~3.4 km from center
        },
        demands: ['All Types Accepted'],
        registeredDonors: []
      }
    ]);

    // 4. Seed SOS Alerts (matching blood-management-sos.pdf & donor-dashboard.pdf)
    await SOSAlert.create([
      {
        hospitalId: xyzHospital._id,
        hospitalName: 'Saint Jude Trauma Center',
        targetBloodType: 'O+',
        requiredQuantity: 4,
        urgencyLevel: 'Critical (24h)',
        location: {
          type: 'Point',
          coordinates: [72.8600, 19.0650] // ~2.4 km away
        },
        status: 'Active'
      },
      {
        hospitalId: cityGeneral._id,
        hospitalName: 'City General Hospital',
        targetBloodType: 'O-',
        requiredQuantity: 5,
        urgencyLevel: 'Urgent',
        location: {
          type: 'Point',
          coordinates: [72.8450, 19.0850] // ~4.1 km away
        },
        status: 'Active'
      },
      {
        hospitalId: xyzHospital._id,
        hospitalName: 'XYZ Hospital',
        targetBloodType: 'O-',
        requiredQuantity: 5,
        urgencyLevel: 'Critical (24h)',
        location: {
          type: 'Point',
          coordinates: [72.8777, 19.0760]
        },
        status: 'In Transit'
      },
      {
        hospitalId: xyzHospital._id,
        hospitalName: 'XYZ Hospital',
        targetBloodType: 'AB-',
        requiredQuantity: 2,
        urgencyLevel: 'Standard',
        location: {
          type: 'Point',
          coordinates: [72.8777, 19.0760]
        },
        status: 'Resolved',
        resolvedBy: 'City General Hospital',
        resolvedDate: new Date('2026-01-14T08:30:00Z')
      }
    ]);

    // 5. Seed Patient Donation Records (matching patient-records.pdf)
    await DonationRecord.create([
      {
        donorBLId: 'BL-2024-78542',
        donorName: 'John Doe',
        facilityId: xyzHospital._id,
        facilityName: 'Saint Jude Trauma Center',
        facilityType: 'hospital',
        date: new Date('2025-10-14'),
        dateString: 'Oct 14, 2025',
        bloodTypeCollected: 'O+',
        donationType: 'Whole Blood',
        quantityMl: 450,
        collectionCenter: 'Saint Jude Emergency Ward',
        attendingStaff: 'Dr. XYZ',
        hemoglobin: 14.2,
        bloodPressure: '118/78',
        screeningStatus: 'Passed',
        isDonation: true,
        isCampAttendance: false,
        isEndorsement: false,
        coinsAwarded: 100,
        status: 'Verified'
      },
      {
        donorBLId: 'BL-2024-78542',
        donorName: 'John Doe',
        facilityId: redCrossNGO._id,
        facilityName: 'City General NGO Drive',
        facilityType: 'ngo',
        date: new Date('2025-07-08'),
        dateString: 'Jul 08, 2025',
        bloodTypeCollected: 'O+',
        donationType: 'Whole Blood',
        quantityMl: 450,
        collectionCenter: 'City General Community Tent',
        attendingStaff: 'Nurse Anjali',
        hemoglobin: 14.0,
        bloodPressure: '120/80',
        screeningStatus: 'Passed',
        isDonation: false,
        isCampAttendance: true,
        isEndorsement: false,
        coinsAwarded: 50,
        status: 'Verified'
      },
      {
        donorBLId: 'BL-2024-78542',
        donorName: 'John Doe',
        facilityId: cityGeneral._id,
        facilityName: 'Metro Blood Bank',
        facilityType: 'hospital',
        date: new Date('2025-04-02'),
        dateString: 'Apr 02, 2025',
        bloodTypeCollected: 'Plasma',
        donationType: 'Plasma',
        quantityMl: 350,
        collectionCenter: 'Metro Apheresis Unit',
        attendingStaff: 'Dr. Kulkarni',
        hemoglobin: 14.5,
        bloodPressure: '115/75',
        screeningStatus: 'Passed',
        isDonation: false,
        isCampAttendance: false,
        isEndorsement: true,
        coinsAwarded: 75,
        status: 'Verified'
      },
      {
        donorBLId: 'BL-2024-78542',
        donorName: 'John Doe',
        facilityId: xyzHospital._id,
        facilityName: 'Saint Jude Trauma Center',
        facilityType: 'hospital',
        date: new Date('2025-01-10'),
        dateString: 'Jan 10, 2025',
        bloodTypeCollected: 'O+',
        donationType: 'Whole Blood',
        quantityMl: 450,
        collectionCenter: 'Main Donor Room',
        attendingStaff: 'Dr. XYZ',
        hemoglobin: 14.1,
        bloodPressure: '118/78',
        screeningStatus: 'Passed',
        isDonation: true,
        isCampAttendance: false,
        isEndorsement: false,
        coinsAwarded: 100,
        status: 'Verified'
      },
      {
        donorBLId: 'BL-2024-78542',
        donorName: 'John Doe',
        facilityId: redCrossNGO._id,
        facilityName: 'Red Cross Mobile Camp',
        facilityType: 'ngo',
        date: new Date('2024-10-18'),
        dateString: 'Oct 18, 2024',
        bloodTypeCollected: 'O+',
        donationType: 'Whole Blood',
        quantityMl: 450,
        collectionCenter: 'Red Cross Mobile Bus',
        attendingStaff: 'Nurse Priya',
        hemoglobin: 13.9,
        bloodPressure: '116/76',
        screeningStatus: 'Passed',
        isDonation: false,
        isCampAttendance: true,
        isEndorsement: false,
        coinsAwarded: 50,
        status: 'Verified'
      }
    ]);

    // 6. Seed Rewards Store Vouchers (matching rewards-store.pdf)
    await RewardItem.create([
      {
        title: 'Full Body Diagnostic Health Voucher',
        provider: 'Clinica Lab Services',
        costCoins: 300,
        image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80',
        stock: 50
      },
      {
        title: 'Local Premium Coffee & Snack Bundle',
        provider: 'The Roasted Bean Cafe',
        costCoins: 100,
        image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
        stock: 100
      },
      {
        title: 'Standard Movie Ticket Pass',
        provider: 'Starlight Cine',
        costCoins: 150,
        image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80',
        stock: 40
      },
      {
        title: 'Smart Fitness Watch Straps',
        provider: 'PulseFit Apparel',
        costCoins: 200,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
        stock: 25
      }
    ]);

    console.log('✅ Database seeded successfully with mock data matching Figma designs!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
}

seedDatabase();
