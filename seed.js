require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Complaint = require('./src/models/Complaint');

// Realistic Cloudinary placeholder URLs for demo
const IMAGES = {
  pothole: 'https://hips.hearstapps.com/hmg-prod/images/5-things-you-need-to-know-about-potholes-1674217331.jpg',
  garbage: 'https://images.mid-day.com/images/images/2023/aug/Garbage-a_d.jpg',
  water: 'https://www.paloaltoplumbing.net/wp-content/uploads/2021/01/Methods-to-Detect-Water-Leaks-.jpg',
  streetlight: 'https://www.hindustantimes.com/ht-img/img/2023/07/23/550x309/A-non-functioning-street-light-at-southern-bypass-_1690134239324.jpg',
  before: 'https://source.roboflow.com/Om46tVlT9NXW3AlVBg0g/usqOsXsWbuzgzobe6OP9/original.jpg',
  after: 'https://spot-boston-res.cloudinary.com/image/upload/f_auto/v1/boston/production/kjcprbyzvcjpiy2qywi7'
};

// Helper to generate fake Twilio SIDs
const generateSid = () => 'SM' + Math.random().toString(16).substr(2, 32);

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Clear existing data
    await User.deleteMany();
    await Complaint.deleteMany();
    console.log('Cleared existing Users and Complaints');

    // 2. Create Users
    const admin = await User.create({
      name: 'Super Admin', email: 'admin@nagardrishti.com', phone: '9000000001',
      password: 'password123', role: 'super_admin'
    });

    const roadsAdmin = await User.create({
      name: 'Roads Admin', email: 'roads@nagardrishti.com', phone: '9000000002',
      password: 'password123', role: 'dept_admin', department: 'roads'
    });

    const sanAdmin = await User.create({
      name: 'Sanitation Admin', email: 'sanitation@nagardrishti.com', phone: '9000000003',
      password: 'password123', role: 'dept_admin', department: 'sanitation'
    });

    const workerAmit = await User.create({
      name: 'Amit (North)', email: 'amit@nagardrishti.com', phone: '9111111111',
      password: 'password123', role: 'field_worker', department: 'roads', zone: 'North Zone'
    });

    const workerRahul = await User.create({
      name: 'Rahul (South)', email: 'rahul@nagardrishti.com', phone: '9222222222',
      password: 'password123', role: 'field_worker', department: 'roads', zone: 'South Zone'
    });

    const workerPriya = await User.create({
      name: 'Priya (Sanitation)', email: 'priya@nagardrishti.com', phone: '9333333333',
      password: 'password123', role: 'field_worker', department: 'sanitation', zone: 'Central Zone'
    });

    console.log('Created 1 Super Admin, 2 Dept Admins, 3 Field Workers');

    // Dates for simulation
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

    // 3. Create Complaints (Various States)

    // --- Complaint 1: Fully Resolved & Closed (With Duplicate) ---
    const c1 = await Complaint.create({
      citizenName: 'Meenal Joshi', citizenPhone: '+919971276426',
      description: 'Big pothole on MG Road', address: 'MG Road, Delhi',
      location: { type: 'Point', coordinates: [77.20, 28.61] },
      imageUrl: IMAGES.pothole, category: 'pothole',
      aiAnalysis: { 
        isValid: true, category: 'pothole', confidence: 0.95, severity: 'high',
        descriptionAnalysis: { sentiment: 'negative', keywords: ['pothole', 'road', 'big'] },
        duplicateOf: null
      },
      status: 'closed', department: 'roads', assignedTo: workerAmit._id,
      priority: 5, reportedAt: fiveDaysAgo, resolvedAt: threeDaysAgo,
      beforeImage: IMAGES.before, afterImage: IMAGES.after, workNote: 'Pothole filled and leveled.',
      resolvedBy: 'Roads Admin', resolutionNote: 'Verified the after photo. Good work.',
      whatsappMessageSid: generateSid(),
      statusHistory: [
        { status: 'pending', timestamp: fiveDaysAgo, note: 'Complaint received via WhatsApp' },
        { status: 'verified', timestamp: fiveDaysAgo, note: 'AI verified. Category: pothole, Severity: high' },
        { status: 'assigned', timestamp: fourDaysAgo, note: 'Assigned to field worker: Amit (North Zone)' },
        { status: 'in_progress', timestamp: fourDaysAgo, note: 'Field team arrived and started work.' },
        { status: 'resolved', timestamp: threeDaysAgo, note: 'Work completed. Note: Pothole filled and leveled.' },
        { status: 'closed', timestamp: threeDaysAgo, note: 'Admin verified the proof and closed the complaint.' }
      ]
    });

    // --- Complaint 2: Garbage (In Progress) ---
    const c2 = await Complaint.create({
      citizenName: 'Rishabh Gupta', citizenPhone: '+919876543210',
      description: 'Garbage dump near market', address: 'Karol Bagh, Delhi',
      location: { type: 'Point', coordinates: [77.19, 28.65] },
      imageUrl: IMAGES.garbage, category: 'garbage',
      aiAnalysis: { 
        isValid: true, category: 'garbage', confidence: 0.88, severity: 'medium',
        descriptionAnalysis: { sentiment: 'negative', keywords: ['garbage', 'dump', 'market'] },
        duplicateOf: null
      },
      status: 'in_progress', department: 'sanitation', assignedTo: workerPriya._id,
      priority: 3, reportedAt: oneDayAgo,
      beforeImage: IMAGES.before,
      whatsappMessageSid: generateSid(),
      statusHistory: [
        { status: 'pending', timestamp: oneDayAgo, note: 'Complaint received via WhatsApp' },
        { status: 'verified', timestamp: oneDayAgo, note: 'AI verified. Category: garbage, Severity: medium' },
        { status: 'assigned', timestamp: oneDayAgo, note: 'Assigned to field worker: Priya (Central Zone)' },
        { status: 'in_progress', timestamp: now, note: 'Field team arrived and started work.' }
      ]
    });

    // --- Complaint 3: Water Leakage (Assigned) ---
    const c3 = await Complaint.create({
      citizenName: 'Prerna Sharma', citizenPhone: '+919988776655',
      description: 'Water pipe leaking on main road', address: 'Connaught Place, Delhi',
      location: { type: 'Point', coordinates: [77.21, 28.63] },
      imageUrl: IMAGES.water, category: 'water_leakage',
      aiAnalysis: { 
        isValid: true, category: 'water_leakage', confidence: 0.78, severity: 'high',
        descriptionAnalysis: { sentiment: 'negative', keywords: ['water', 'pipe', 'leak'] },
        duplicateOf: null
      },
      status: 'assigned', department: 'water', assignedTo: workerRahul._id,
      priority: 5, reportedAt: now,
      whatsappMessageSid: generateSid(),
      statusHistory: [
        { status: 'pending', timestamp: now, note: 'Complaint received via WhatsApp' },
        { status: 'verified', timestamp: now, note: 'AI verified. Category: water_leakage, Severity: high' },
        { status: 'assigned', timestamp: now, note: 'Assigned to field worker: Rahul (South Zone)' }
      ]
    });

    // --- Complaint 4: Streetlight (Verified, Not Assigned) ---
    const c4 = await Complaint.create({
      citizenName: 'Aarav Singh', citizenPhone: '+917766554433',
      description: 'Broken streetlight leading to darkness', address: 'Rohini, Delhi',
      location: { type: 'Point', coordinates: [77.10, 28.70] },
      imageUrl: IMAGES.streetlight, category: 'other',
      aiAnalysis: { 
        isValid: true, category: 'other', confidence: 0.65, severity: 'medium',
        descriptionAnalysis: { sentiment: 'negative', keywords: ['broken', 'streetlight', 'dark'] },
        duplicateOf: null
      },
      status: 'verified', department: 'electricity', priority: 3, reportedAt: now,
      whatsappMessageSid: generateSid(),
      statusHistory: [
        { status: 'pending', timestamp: now, note: 'Complaint received via WhatsApp' },
        { status: 'verified', timestamp: now, note: 'AI verified. Category: other, Severity: medium' }
      ]
    });

    // --- Complaint 5: Pending (AI Processing) ---
    const c5 = await Complaint.create({
      citizenName: 'Neha Verma', citizenPhone: '+916655443322',
      description: 'Small pothole forming', address: 'Dwarka, Delhi',
      location: { type: 'Point', coordinates: [77.05, 28.58] },
      imageUrl: IMAGES.pothole, category: 'pothole',
      aiAnalysis: { 
        isValid: false, category: 'other', confidence: 0, severity: 'medium',
        descriptionAnalysis: { sentiment: 'negative', keywords: ['pothole'] },
        duplicateOf: null
      },
      status: 'pending', priority: 3, reportedAt: now,
      whatsappMessageSid: generateSid(),
      statusHistory: [
        { status: 'pending', timestamp: now, note: 'Complaint received via WhatsApp' }
      ]
    });

    // --- Complaint 6: Rejected ---
    const c6 = await Complaint.create({
      citizenName: 'Fake User', citizenPhone: '+915544332211',
      description: 'Testing 123', address: 'Unknown',
      location: { type: 'Point', coordinates: [77.00, 28.50] },
      imageUrl: IMAGES.garbage, category: 'other',
      aiAnalysis: { 
        isValid: false, category: 'other', confidence: 0.1, severity: 'low',
        descriptionAnalysis: { sentiment: 'neutral', keywords: ['testing'] },
        duplicateOf: null
      },
      status: 'rejected', priority: 1, reportedAt: now,
      whatsappMessageSid: generateSid(),
      statusHistory: [
        { status: 'pending', timestamp: now, note: 'Complaint received via WhatsApp' },
        { status: 'rejected', timestamp: now, note: 'AI rejected: Image and Text do not match.' }
      ]
    });

    // --- 4. Create a Duplicate Complaint (Linked to c1) ---
    const duplicate = await Complaint.create({
      citizenName: 'Duplicate Reporter', citizenPhone: '+914433221100',
      description: 'Same pothole on MG Road', address: 'MG Road, Delhi',
      location: { type: 'Point', coordinates: [77.2001, 28.6101] },
      imageUrl: IMAGES.pothole, category: 'pothole',
      aiAnalysis: { 
        isValid: true, category: 'pothole', confidence: 0.85, severity: 'high',
        descriptionAnalysis: { sentiment: 'negative', keywords: ['pothole', 'same'] },
        duplicateOf: c1._id 
      },
      status: 'duplicate', department: 'roads', priority: 3, reportedAt: threeDaysAgo,
      whatsappMessageSid: generateSid(),
      statusHistory: [
        { status: 'pending', timestamp: threeDaysAgo, note: 'Complaint received via WhatsApp' },
        { status: 'duplicate', timestamp: threeDaysAgo, note: `Marked as duplicate of complaint ${c1._id}` }
      ]
    });

    // 5. Update the original complaint with the duplicate linkage data
    await Complaint.findByIdAndUpdate(c1._id, { 
      duplicateCount: 1,
      duplicateReports: [{
        complaintId: duplicate._id,
        reportedAt: threeDaysAgo
      }]
    });

    console.log('Created 7 Complaints in various states with complete metadata');
    console.log('🎉 Database Seeding Completed Successfully!');
    
    process.exit();
  } catch (error) {
    console.error('Seeding Error:', error);
    process.exit(1);
  }
};

seedDB();