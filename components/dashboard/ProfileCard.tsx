"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Member } from "../../lib/api/member-api";

interface ProfileCardProps {
  member: Member;
  onUpdate: (updates: Partial<Member>) => Promise<void>;
  isUpdating?: boolean;
}

export default function ProfileCard({ member, onUpdate, isUpdating = false }: ProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phone: member.phone,
    dateOfBirth: member.dateOfBirth || "",
    gender: member.gender || "",
    address: member.address || "",
    ntrpRating: member.ntrpRating || "",
    ustaNumber: member.ustaNumber || "",
  });
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await onUpdate(formData);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone,
      dateOfBirth: member.dateOfBirth || "",
      gender: member.gender || "",
      address: member.address || "",
      ntrpRating: member.ntrpRating || "",
      ustaNumber: member.ustaNumber || "",
    });
    setError("");
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">
          <span className="gradient-text">Profile Information</span>
        </h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="btn-secondary text-sm"
          >
            Edit Profile
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="ntrpRating" className="block text-sm font-medium text-gray-700 mb-2">
                NTRP Rating
              </label>
              <input
                id="ntrpRating"
                name="ntrpRating"
                type="text"
                value={formData.ntrpRating}
                onChange={handleChange}
                placeholder="e.g., 4.5"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="ustaNumber" className="block text-sm font-medium text-gray-700 mb-2">
                USTA Number
              </label>
              <input
                id="ustaNumber"
                name="ustaNumber"
                type="text"
                value={formData.ustaNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-4 pt-4">
            <button
              type="submit"
              disabled={isUpdating}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">First Name</label>
              <p className="text-gray-900 font-medium">{member.firstName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Last Name</label>
              <p className="text-gray-900 font-medium">{member.lastName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
              <p className="text-gray-900">{member.email}</p>
              {!member.emailVerified && (
                <span className="text-xs text-red-600">(Not verified)</span>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
              <p className="text-gray-900">{member.phone}</p>
            </div>
            {member.dateOfBirth && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Date of Birth</label>
                <p className="text-gray-900">{member.dateOfBirth}</p>
              </div>
            )}
            {member.gender && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Gender</label>
                <p className="text-gray-900">{member.gender}</p>
              </div>
            )}
            {member.ntrpRating && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">NTRP Rating</label>
                <p className="text-gray-900">{member.ntrpRating}</p>
              </div>
            )}
            {member.ustaNumber && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">USTA Number</label>
                <p className="text-gray-900">{member.ustaNumber}</p>
              </div>
            )}
            {member.address && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                <p className="text-gray-900">{member.address}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
