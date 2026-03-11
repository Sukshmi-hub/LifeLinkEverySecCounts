import mongoose from 'mongoose';

const TributeSchema = new mongoose.Schema(
  {
    donorName: {
      type: String,
      required: [true, 'Donor name is required'],
      trim: true,
      minlength: [3, 'Donor name must be at least 3 characters'],
      maxlength: [100, 'Donor name must be at most 100 characters'],
    },
    age: {
      type: Number,
      required: [true, 'Donor age is required'],
      min: [18, 'Donor age must be at least 18'],
      max: [70, 'Donor age must be at most 70'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      maxlength: [150, 'Location must be at most 150 characters'],
    },
    donationType: {
      type: String,
      required: [true, 'Donation type is required'],
      enum: {
        values: [
          'Kidney',
          'Liver',
          'Heart',
          'Lung',
          'Pancreas',
          'Cornea',
          'Bone Marrow',
          'Blood',
        ],
        message: 'Donation type must be one of the supported organ/tissue types',
      },
    },
    hospitalName: {
      type: String,
      required: [true, 'Hospital name is required'],
      trim: true,
      maxlength: [150, 'Hospital name must be at most 150 characters'],
    },
    aboutDonor: {
      type: String,
      required: [true, 'About the donor is required'],
      trim: true,
      minlength: [20, 'About the donor must be at least 20 characters'],
      maxlength: [700, 'About the donor must be at most 700 characters'],
    },
    photoUrl: {
      type: String,
      default: null,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'archived'],
        message: 'Status must be either active or archived',
      },
      default: 'active',
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'hospitalId (submitting hospital) is required'],
    },
  },
  { timestamps: true }
);

export default mongoose.model('Tribute', TributeSchema);
