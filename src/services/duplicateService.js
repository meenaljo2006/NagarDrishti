const Complaint = require('../models/Complaint');

const DUPLICATE_RADIUS_METERS = 100;
const DUPLICATE_TIME_WINDOW_DAYS = 7;

/**
 * Find duplicate complaints near a new complaint.
 *
 * @param {Object} params
 * @param {string} params.category - AI category of new complaint
 * @param {number[]} params.coordinates - [lng, lat] of new complaint
 * @returns {Promise<Object|null>} - Original complaint if found, else null
 */
exports.findDuplicate = async ({ category, coordinates }) => {
  try {
    if (!category || !coordinates || coordinates.length !== 2) {
      return null;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - DUPLICATE_TIME_WINDOW_DAYS);

    console.log(`Checking for duplicates: ${category} at [${coordinates}]`);

    // Find nearby complaint with same category
    const existing = await Complaint.findOne({
      'aiAnalysis.category': category,
      status: { $in: ['pending', 'verified', 'assigned', 'in_progress'] },
      reportedAt: { $gte: sevenDaysAgo },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates,
          },
          $maxDistance: DUPLICATE_RADIUS_METERS,
        },
      },
    });

    if (existing) {
      console.log(`Duplicate found: ${existing._id} (${existing.status})`);
    } else {
      console.log(`No duplicate found`);
    }

    return existing;
  } catch (error) {
    console.error('Duplicate check error:', error.message);
    return null;
  }
};

/**
 * Mark a new complaint as duplicate of an original one.
 * Also increments the duplicate counter on the original.
 */
exports.markAsDuplicate = async (complaint, originalId) => {
  // Update new complaint
  complaint.status = 'duplicate';
  complaint.aiAnalysis.duplicateOf = originalId;
  complaint.statusHistory.push({
    status: 'duplicate',
    timestamp: new Date(),
    note: `Marked as duplicate of complaint ${originalId}`,
  });
  await complaint.save();

  // Increment duplicate count on original
  await Complaint.findByIdAndUpdate(originalId, {
    $inc: { duplicateCount: 1 },
    $push: {
      duplicateReports: {
        complaintId: complaint._id,
        reportedAt: new Date(),
      },
    },
  });

  return complaint;
};