require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Complaint = require('./src/models/Complaint');

// 1. Verified & Reliable Civic Issue Images
const CATEGORY_IMAGES = {
  pothole: [
    'https://ichef.bbci.co.uk/ace/standard/2048/cpsprodpb/9f16/live/d0f412a0-e492-11f0-a06d-4903df3f724c.jpg', // Pothole
    'https://images.ctfassets.net/pjshm78m9jt4/41wm4pjnpt6y8w4L8jeeVU/642bdb9aba659a053394fc20d7fdc841/Screenshot_2024-01-16_at_11.54.04.png?fm=jpg&fit=fill&w=650&h=366&q=80', // Pothole
    'https://swikblog.com/wp-content/uploads/2026/01/potholes-england-300kb.jpg', // Broken road
    'https://i.dailymail.co.uk/i/pix/2014/01/13/article-0-16BA04A1000005DC-741_636x382.jpg'  // Damaged road
  ],
  garbage: [
    'https://images.timesnowhindi.com/photo/msid-154442109/154442109.jpg', // Garbage pile
    'https://files.prokerala.com/news/photos/imgs/1024/garbage-dumped-on-a-delhi-road-on-june-22-2017-552993.jpg', // Trash bags
    'https://static.toiimg.com/thumb/msid-70355131,imgsize-3998918,width-400,resizemode-4/70355131.jpg', // Waste
    'https://assets.thehansindia.com/h-upload/feeds/2019/04/21/166713-anjaiah-nagar-residents.jpg'  // Street garbage
  ],
  water_leakage: [
    'https://www.bluebot.com/wp-content/uploads/2022/02/Under-ground-water-leak-bluebot-smart-water-meter.jpg', // Water pipe
    'https://www.dansdrainsanddigs.com/wp-content/uploads/2024/05/in-blog-photo-57.jpg', // Street water
    'https://cleanandclearplumbing.com.au/wp-content/uploads/2026/03/burst-pipe.png', // Leaking water
    'https://www.queenslandcountrylife.com.au/images/transform/v1/crop/frm/UdNE97Se3RqCx9C2EmYtgx/2c482c91-b64e-4596-9488-40b25f6e174a.jpg/r0_0_1599_1204_w1200_h678_fmax.jpg'  // Water on road
  ],
  other: [
    'https://c2.staticflickr.com/4/3618/3383458014_d7850bddb2_b.jpg', // Broken streetlight
    'https://media.istockphoto.com/id/1444899925/photo/broken-park-bench-vandals-broke-a-park-bench.jpg?s=170667a&w=0&k=20&c=7DUvpk_9ZQ6YLBYOOrS4Bt3iPA0DiyOakEnGujdxgr0=', // Public infra
    'https://media.istockphoto.com/id/157481087/photo/fallen-tree-blocking-road.jpg?s=612x612&w=0&k=20&c=PxqjhdPyNVtCIOhA8U-wWKH42wMvJvnuWzhRRXML4Fw=', // Broken area
    'https://5.imimg.com/data5/ANDROID/Default/2023/3/293773582/OO/NW/YC/35477174/product-jpeg-500x500.jpg'  // Misc issue
  ]
};

// After Images (Proof of Work - Clean Roads, Clean Streets, Dry Roads)
const AFTER_IMAGES = {
  roads: 'https://www.abc4.com/wp-content/uploads/sites/4/2026/04/0202PH_MXF_16.52.43.20.jpg?w=900', // Smooth road
  sanitation: 'https://static.toiimg.com/photo/imgsize-185265,msid-65759780/65759780.jpg', // Clean street
  water: 'https://www.shutterstock.com/image-photo/sewer-repair-place-drain-ground-600nw-2676292219.jpg', // Dry road
  other: 'https://c8.alamy.com/comp/2KJG4XW/an-old-lady-standing-in-front-of-wooden-benches-in-the-park-on-a-sunny-day-2KJG4XW.jpg'
};

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

const CITIZENS = ['Rahul Sharma', 'Meenal Joshi', 'Prerna Gupta', 'Rishabh Verma', 'Aarav Singh', 'Neha Verma', 'Karan Malhotra', 'Simran Kaur'];

const generateSid = () => 'SM' + Math.random().toString(16).substr(2, 32);
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    await User.deleteMany();
    await Complaint.deleteMany();
    console.log('🗑️  Cleared existing data. Starting fresh generation...');

    // STEP 1: CREATE USERS
    await User.create({ name: 'Super Admin', email: 'admin@nagardrishti.com', phone: '9000000001', password: 'password123', role: 'super_admin' });
    await User.create({ name: 'Roads Admin', email: 'roads@nagardrishti.com', phone: '9000000002', password: 'password123', role: 'dept_admin', department: 'roads' });
    await User.create({ name: 'Sanitation Admin', email: 'sanitation@nagardrishti.com', phone: '9000000003', password: 'password123', role: 'dept_admin', department: 'sanitation' });
    await User.create({ name: 'Water Admin', email: 'water@nagardrishti.com', phone: '9000000004', password: 'password123', role: 'dept_admin', department: 'water' });

    const roadsWorkers = await User.insertMany([
      { name: 'Amit (North)', email: 'amit@nagardrishti.com', phone: '9111111111', password: 'password123', role: 'field_worker', department: 'roads', zone: 'North Zone' },
      { name: 'Rahul (South)', email: 'rahul@nagardrishti.com', phone: '9222222222', password: 'password123', role: 'field_worker', department: 'roads', zone: 'South Zone' },
      { name: 'Suresh (East)', email: 'suresh@nagardrishti.com', phone: '9333333331', password: 'password123', role: 'field_worker', department: 'roads', zone: 'East Zone' }
    ]);

    const sanWorkers = await User.insertMany([
      { name: 'Priya (Sanitation)', email: 'priya@nagardrishti.com', phone: '9333333333', password: 'password123', role: 'field_worker', department: 'sanitation', zone: 'Central Zone' },
      { name: 'Kavita (Sanitation)', email: 'kavita@nagardrishti.com', phone: '9333333334', password: 'password123', role: 'field_worker', department: 'sanitation', zone: 'North Zone' }
    ]);

    const waterWorkers = await User.insertMany([
      { name: 'Ravi (Water)', email: 'ravi@nagardrishti.com', phone: '9444444444', password: 'password123', role: 'field_worker', department: 'water', zone: 'West Zone' },
      { name: 'Manoj (Water)', email: 'manoj@nagardrishti.com', phone: '9444444445', password: 'password123', role: 'field_worker', department: 'water', zone: 'East Zone' }
    ]);

    const allWorkers = [...roadsWorkers, ...sanWorkers, ...waterWorkers];
    console.log('👥 Users created successfully');

    // STEP 2: GENERATE 150 COMPLAINTS
    const categories = ['pothole', 'garbage', 'water_leakage', 'other'];
    const statuses = ['pending', 'verified', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected'];
    const complaints = [];

    // Loop runs 150 times to generate 150 complaints
    for (let i = 0; i < 150; i++) {
      const category = randomItem(categories);
      const locationData = randomItem(LOCATIONS);
      
      const lng = locationData.coordinates[0] + (Math.random() - 0.5) * 0.02;
      const lat = locationData.coordinates[1] + (Math.random() - 0.5) * 0.02;

      let department = 'other';
      if (category === 'pothole') department = 'roads';
      else if (category === 'garbage') department = 'sanitation';
      else if (category === 'water_leakage') department = 'water';

      const severity = randomItem(['low', 'medium', 'high']);
      let priority = severity === 'high' ? 5 : (severity === 'medium' ? 3 : 1);

      let status = randomItem(statuses);
      if (category === 'other') status = randomItem(['pending', 'verified', 'rejected']);

      // FIX: Force even distribution across 7 days (i % 7)
      const daysAgo = i % 7; 
      // This creates a timestamp: Today - (0 to 6 days) - (random hours/minutes)
      const reportedAt = new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000) - (Math.random() * 24 * 60 * 60 * 1000));
      
      const randomImage = randomItem(CATEGORY_IMAGES[category]);
      
      const complaintData = {
        citizenName: randomItem(CITIZENS),
        citizenPhone: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
        description: `${category.replace('_', ' ')} issue found near ${locationData.address}`,
        location: { type: 'Point', coordinates: [lng, lat] },
        address: locationData.address,
        imageUrl: randomImage,
        category: category,
        department: department,
        priority: priority,
        reportedAt: reportedAt,
        whatsappMessageSid: generateSid(),
        aiAnalysis: {
          isValid: status !== 'rejected',
          category: category,
          confidence: Number((Math.random() * 0.3 + 0.7).toFixed(2)),
          severity: severity,
          descriptionAnalysis: { sentiment: 'negative', keywords: [category.split('_')[0], 'issue'] },
          duplicateOf: null
        },
        status: status,
        statusHistory: []
      };

      let currentTime = new Date(reportedAt);
      complaintData.statusHistory.push({ status: 'pending', timestamp: currentTime, note: 'Complaint received via WhatsApp' });

      if (status === 'rejected') {
        complaintData.statusHistory.push({ status: 'rejected', timestamp: new Date(currentTime.getTime() + 60000), note: 'AI verification failed: Image and text mismatch.' });
      } 
      else if (status !== 'pending') {
        currentTime = new Date(currentTime.getTime() + 60000);
        complaintData.statusHistory.push({ status: 'verified', timestamp: currentTime, note: 'AI verified. Routed to department.' });

        if (['assigned', 'in_progress', 'resolved', 'closed'].includes(status)) {
          if (department !== 'other') {
            const deptWorkers = allWorkers.filter(w => w.department === department);
            const assignedWorker = deptWorkers.length > 0 ? randomItem(deptWorkers) : randomItem(allWorkers);
            
            currentTime = new Date(currentTime.getTime() + 3600000);
            complaintData.assignedTo = assignedWorker._id;
            complaintData.statusHistory.push({ status: 'assigned', timestamp: currentTime, note: `Assigned to field worker: ${assignedWorker.name}` });

            if (['in_progress', 'resolved', 'closed'].includes(status)) {
              currentTime = new Date(currentTime.getTime() + 7200000);
              complaintData.beforeImage = randomImage;
              complaintData.statusHistory.push({ status: 'in_progress', timestamp: currentTime, note: 'Field team arrived and started work.' });

              if (['resolved', 'closed'].includes(status)) {
                currentTime = new Date(currentTime.getTime() + 86400000);
                complaintData.afterImage = AFTER_IMAGES[department] || AFTER_IMAGES.other;
                complaintData.workNote = 'Issue successfully resolved. Area cleaned and inspected.';
                complaintData.resolvedAt = currentTime;
                complaintData.statusHistory.push({ status: 'resolved', timestamp: currentTime, note: 'Work completed. Uploaded proof.' });

                if (status === 'closed') {
                  currentTime = new Date(currentTime.getTime() + 3600000); 
                  complaintData.resolvedBy = `${department.toUpperCase()} Admin`;
                  complaintData.resolutionNote = 'Verified the proof. Good work by the field team.';
                  complaintData.statusHistory.push({ status: 'closed', timestamp: currentTime, note: 'Admin verified and closed the complaint.' });
                }
              }
            }
          }
        }
      }
      complaints.push(complaintData);
    }

    const insertedComplaints = await Complaint.insertMany(complaints);
    console.log(`📝 Inserted ${insertedComplaints.length} complaints perfectly distributed over 7 days!`);

    // STEP 3: CREATE DUPLICATES
    const potentialParents = insertedComplaints.filter(c => ['resolved', 'closed'].includes(c.status) && c.category !== 'other');
    const validParents = potentialParents.length >= 5 ? potentialParents : insertedComplaints.filter(c => c.category !== 'other');

    for (let i = 0; i < 5; i++) { 
      if (!validParents[i * 10]) continue;
      const parent = validParents[i * 10];
      
      for (let j = 0; j < 2; j++) {
        const dupReportedAt = new Date(parent.reportedAt.getTime() + 1800000);
        await Complaint.create({
          citizenName: randomItem(CITIZENS),
          citizenPhone: `+9188${Math.floor(10000000 + Math.random() * 90000000)}`,
          description: `Same issue: ${parent.description}`,
          location: { type: 'Point', coordinates: [parent.location.coordinates[0] + 0.0001, parent.location.coordinates[1] - 0.0001] },
          address: parent.address,
          imageUrl: parent.imageUrl,
          category: parent.category,
          department: parent.department,
          priority: parent.priority,
          reportedAt: dupReportedAt,
          whatsappMessageSid: generateSid(),
          aiAnalysis: {
            isValid: true, category: parent.category, confidence: 0.89, severity: parent.aiAnalysis.severity,
            descriptionAnalysis: { sentiment: 'negative', keywords: [parent.category] }, duplicateOf: parent._id
          },
          status: 'duplicate',
          statusHistory: [
            { status: 'pending', timestamp: dupReportedAt, note: 'Complaint received' },
            { status: 'duplicate', timestamp: new Date(dupReportedAt.getTime() + 60000), note: `Marked as duplicate of ${parent._id}` }
          ]
        });

        await Complaint.findByIdAndUpdate(parent._id, {
          $inc: { duplicateCount: 1 },
          $push: { duplicateReports: { complaintId: parent._id, reportedAt: dupReportedAt } }
        });
      }
    }

    console.log('🎉 Seeding Completed Successfully! Total complaints: ' + (150 + 10));
    process.exit();

  } catch (error) {
    console.error('Seeding Error:', error);
    process.exit(1);
  }
};

seedDB();