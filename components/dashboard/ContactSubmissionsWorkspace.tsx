"use client";

import { useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { useAuth } from "../../lib/auth/auth-context";
import {
  AdminContactSubmission,
  getAdminContactSubmissions,
} from "../../lib/api/contact-api";

function formatDateTime(value: string) {
  try {
    return format(new Date(value), "MMM d, yyyy h:mm a");
  } catch {
    return value;
  }
}

function countByStatus(submissions: AdminContactSubmission[], status: AdminContactSubmission["status"]) {
  return submissions.filter((submission) => submission.status === status).length;
}

export default function ContactSubmissionsWorkspace() {
  const { token } = useAuth();
  const [submissions, setSubmissions] = useState<AdminContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    const loadSubmissions = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getAdminContactSubmissions(token);
        setSubmissions(data);
      } catch (err: any) {
        setError(err.message || "Failed to load contact submissions");
      } finally {
        setLoading(false);
      }
    };

    loadSubmissions();
  }, [token]);

  const summary = useMemo(() => {
    return {
      total: submissions.length,
      new: countByStatus(submissions, "new"),
      read: countByStatus(submissions, "read"),
      replied: countByStatus(submissions, "replied"),
    };
  }, [submissions]);

  if (loading) {
    return <div className="card">Loading contact submissions...</div>;
  }

  if (error) {
    return <div className="card text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          <span className="gradient-text">Contact Submissions</span>
        </h1>
        <p className="text-gray-600">
          Review inbound messages from the public contact form and follow up from the admin dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-2xl font-bold">{summary.total}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">New</div>
          <div className="text-2xl font-bold">{summary.new}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Read</div>
          <div className="text-2xl font-bold">{summary.read}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Replied</div>
          <div className="text-2xl font-bold">{summary.replied}</div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold">Inbox</h2>
            <p className="text-sm text-gray-500">Newest messages appear first.</p>
          </div>
          {submissions.length > 0 && (
            <div className="text-sm text-gray-500">
              Latest received {formatDistanceToNow(new Date(submissions[0].createdAt), { addSuffix: true })}
            </div>
          )}
        </div>

        {submissions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
            <p className="text-lg font-semibold text-gray-800">No contact submissions yet.</p>
            <p className="mt-2 text-sm text-gray-500">
              Messages sent through the public contact form will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <article
                key={submission.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{submission.name}</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                          submission.status === "new"
                            ? "bg-amber-100 text-amber-800"
                            : submission.status === "read"
                            ? "bg-blue-100 text-blue-800"
                            : submission.status === "replied"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {submission.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                      <a
                        href={`mailto:${submission.email}`}
                        className="font-medium text-primary-600 hover:text-primary-700"
                      >
                        {submission.email}
                      </a>
                      <span>Received {formatDateTime(submission.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-700 whitespace-pre-wrap">
                  {submission.message}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
