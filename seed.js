require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Complaint = require('./src/models/Complaint');

// Realistic Locations in Delhi NCR
const LOCATIONS = [
  { address: 'Connaught Place, New Delhi', coordinates: [77.2167, 28.6315] },
  { address: 'Karol Bagh, New Delhi', coordinates: [77.1900, 28.6517] },
  { address: 'Dwarka Sector 10, New Delhi', coordinates: [77.0500, 28.5800] },
  { address: 'Rohini Sector 7, New Delhi', coordinates: [77.1000, 28.7000] },
  { address: 'Saket, New Delhi', coordinates: [77.2100, 28.5200] },
  { address: 'Lajpat Nagar, New Delhi', coordinates: [77.2400, 28.5700] },
  { address: 'Pitampura, New Delhi', coordinates: [77.1300, 28.6900] },
  { address: 'Hauz Khas, New Delhi', coordinates: [77.2000, 28.5500] },
  { address: 'Vasant Kunj, New Delhi', coordinates: [77.1500, 28.5200] },
  { address: 'Mayur Vihar, New Delhi', coordinates: [77.2900, 28.6000] }
];

// Updated Images matching your 4 categories
const IMAGES = {
  pothole: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600',
  garbage: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600',
  water_leakage: 'https://images.unsplash.com/photo-1584285405429-136bf988919c?w=600',
  other: 'https://images.unsplash.com/photo-1509024644558-2f56ce76c490?w=600',
  before: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600',
  after: 'https://images.unsplash.com/photo-1590093804680-4d6b8b8b8b8b?w=600'
};

const generateSid = () => 'SM' + Math.random().toString(16).substr(2, 32);
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (daysAgo) => new Date(Date.now() - Math.random() * daysAgo * 24 * 60 * 60 * 1000);

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Clear existing data
    await User.deleteMany();
    await Complaint.deleteMany();
    console.log('Cleared existing data');

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

    const waterAdmin = await User.create({
      name: 'Water Admin', email: 'water@nagardrishti.com', phone: '9000000004',
      password: 'password123', role: 'dept_admin', department: 'water'
    });

    const otherAdmin = await User.create({
      name: 'Other Dept Admin', email: 'other@nagardrishti.com', phone: '9000000005',
      password: 'password123', role: 'dept_admin', department: 'other'
    });

    // Field Workers
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

    const workerRavi = await User.create({
      name: 'Ravi (Water)', email: 'ravi@nagardrishti.com', phone: '9444444444',
      password: 'password123', role: 'field_worker', department: 'water', zone: 'West Zone'
    });

    const workerVikram = await User.create({
      name: 'Vikram (Other)', email: 'vikram@nagardrishti.com', phone: '9555555555',
      password: 'password123', role: 'field_worker', department: 'other', zone: 'East Zone'
    });

    const allWorkers = [workerAmit, workerRahul, workerPriya, workerRavi, workerVikram];
    console.log('Created Super Admin, 4 Dept Admins, and 5 Field Workers');

    // 3. Generate 50 Random Complaintss
    const categories = ['pothole', 'garbage', 'water_leakage', 'other'];
    const statuses = ['pending', 'verified', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected'];
    
    const complaints = [];

    for (let i = 0; i < 50; i++) {
      const category = randomItem(categories);
      let department = 'other';
      if (category === 'pothole') department = 'roads';
      else if (category === 'garbage') department = 'sanitation';
      else if (category === 'water_leakage') department = 'water';
      
      const locationData = randomItem(LOCATIONS);
      // Add slight randomness to coordinates so they don't overlap exactly
      const lng = locationData.coordinates[0] + (Math.random() - 0.5) * 0.02;
      const lat = locationData.coordinates[1] + (Math.random() - 0.5) * 0.02;

      const status = randomItem(statuses);
      // Spread complaints over the last 7 days for the Trend Chart
      const reportedAt = randomDate(7); 
      
      const complaintData = {
        citizenName: randomItem(['Rahul', 'Meenal', 'Prerna', 'Rishabh', 'Aarav', 'Neha', 'Karan', 'Simran']),
        citizenPhone: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
        description: `Issue regarding ${category.replace('_', ' ')} found at ${locationData.address}`,
        location: { type: 'Point', coordinates: [lng, lat] },
        address: locationData.address,
        imageUrl: IMAGES[category],
        category: category,
        department: department,
        priority: randomItem([1, 2, 3, 4, 5]),
        reportedAt: reportedAt,
        whatsappMessageSid: generateSid(),
        aiAnalysis: {
          isValid: status !== 'rejected',
          category: category,
          confidence: Number((Math.random() * 0.4 + 0.6).toFixed(2)),
          severity: randomItem(['low', 'medium', 'high']),
          descriptionAnalysis: { sentiment: 'negative', keywords: [category.split('_')[0], 'issue'] },
          duplicateOf: null
        },
        status: status,
        statusHistory: [
          { status: 'pending', timestamp: reportedAt, note: 'Complaint received via WhatsApp' }
        ]
      };

      // Setup lifecycle based on status
      if (status !== 'pending' && status !== 'rejected') {
        complaintData.statusHistory.push({ status: 'verified', timestamp: new Date(reportedAt.getTime() + 60000), note: 'AI verified.' });
      }

      if (['assigned', 'in_progress', 'resolved', 'closed'].includes(status)) {
        const deptWorkers = allWorkers.filter(w => w.department === department);
        const assignedWorker = deptWorkers.length > 0 ? randomItem(deptWorkers) : randomItem(allWorkers);
        
        complaintData.assignedTo = assignedWorker._id;
        complaintData.statusHistory.push({ status: 'assigned', timestamp: new Date(reportedAt.getTime() + 3600000), note: `Assigned to ${assignedWorker.name}` });
      }

      if (['in_progress', 'resolved', 'closed'].includes(status)) {
        complaintData.beforeImage = IMAGES.before;
        complaintData.statusHistory.push({ status: 'in_progress', timestamp: new Date(reportedAt.getTime() + 7200000), note: 'Work started.' });
      }

      if (['resolved', 'closed'].includes(status)) {
        complaintData.afterImage = IMAGES.after;
        complaintData.workNote = 'Issue resolved and area cleaned.';
        complaintData.resolvedAt = new Date(reportedAt.getTime() + 86400000);
        complaintData.statusHistory.push({ status: 'resolved', timestamp: complaintData.resolvedAt, note: 'Work completed.' });
      }

      if (status === 'closed') {
        complaintData.resolvedBy = `${department.toUpperCase()} Admin`;
        complaintData.resolutionNote = 'Verified the after photo. Good work.';
        complaintData.statusHistory.push({ status: 'closed', timestamp: new Date(reportedAt.getTime() + 90000000), note: 'Complaint closed by admin.' });
      }

      if (status === 'rejected') {
        complaintData.statusHistory.push({ status: 'rejected', timestamp: new Date(reportedAt.getTime() + 60000), note: 'AI rejected: Image and Text do not match.' });
      }

      complaints.push(complaintData);
    }

    const insertedComplaints = await Complaint.insertMany(complaints);
    console.log(`Inserted ${insertedComplaints.length} random complaints`);

    // 4. Create Duplicate Clusters
    console.log('Generating duplicate clusters...');
    
    for (let i = 0; i < 2; i++) {
      const parent = insertedComplaints[i * 15]; 
      
      for (let j = 0; j < 2; j++) {
        const duplicate = await Complaint.create({
          citizenName: `Citizen ${j}`,
          citizenPhone: `+9188${Math.floor(10000000 + Math.random() * 90000000)}`,
          description: `Same issue: ${parent.description}`,
          location: { type: 'Point', coordinates: [parent.location.coordinates[0] + 0.0001, parent.location.coordinates[1] - 0.0001] },
          address: parent.address,
          imageUrl: parent.imageUrl,
          category: parent.category,
          department: parent.department,
          priority: parent.priority,
          reportedAt: new Date(parent.reportedAt.getTime() + 3600000),
          whatsappMessageSid: generateSid(),
          aiAnalysis: {
            isValid: true,
            category: parent.category,
            confidence: 0.85,
            severity: parent.priority > 3 ? 'high' : 'medium',
            descriptionAnalysis: { sentiment: 'negative', keywords: [parent.category] },
            duplicateOf: parent._id
          },
          status: 'duplicate',
          statusHistory: [
            { status: 'pending', timestamp: new Date(), note: 'Complaint received' },
            { status: 'duplicate', timestamp: new Date(), note: `Marked as duplicate of ${parent._id}` }
          ]
        });

        await Complaint.findByIdAndUpdate(parent._id, {
          $inc: { duplicateCount: 1 },
          $push: { duplicateReports: { complaintId: duplicate._id, reportedAt: new Date() } }
        });
      }
    }

    console.log('🎉 Seeding Completed! 50+ Complaints and multiple users generated.');
    process.exit();

  } catch (error) {
    console.error('Seeding Error:', error);
    process.exit(1);
  }
};

seedDB();