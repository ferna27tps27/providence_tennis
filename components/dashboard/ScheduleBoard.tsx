"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { useAuth } from "../../lib/auth/auth-context";
import {
  createPrivateLessonRecord,
  createRecurringProgramRecord,
  getRecurringPrograms,
  getSchedule,
  getScheduleCourts,
  getScheduleMembers,
  PrivateLessonRecord,
  RecurringProgramRecord,
  ScheduleCourt,
  ScheduleItem,
  ScheduleMember,
} from "../../lib/api/schedule-api";

function weekdayLabel(weekday: number): string {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][weekday] || "Unknown";
}

export default function ScheduleBoard() {
  const { token, user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [programs, setPrograms] = useState<RecurringProgramRecord[]>([]);
  const [courts, setCourts] = useState<ScheduleCourt[]>([]);
  const [coaches, setCoaches] = useState<ScheduleMember[]>([]);
  const [players, setPlayers] = useState<ScheduleMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lessonForm, setLessonForm] = useState({
    courtId: "",
    coachId: "",
    playerId: "",
    date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
    start: "09:00",
    end: "10:00",
    lessonType: "Private Lesson",
    price: "",
    notes: "",
  });
  const [programForm, setProgramForm] = useState({
    name: "",
    coachId: "",
    courtId: "",
    weekday: "1",
    startTime: "16:00",
    endTime: "17:00",
    capacity: "4",
    startsOn: format(addDays(new Date(), 1), "yyyy-MM-dd"),
    endsOn: "",
    price: "",
    description: "",
  });

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const dateFrom = format(weekDates[0], "yyyy-MM-dd");
  const dateTo = format(weekDates[6], "yyyy-MM-dd");

  const loadData = async (activeToken: string) => {
    setLoading(true);
    setError("");

    try {
      const [schedule, nextPrograms, nextCourts, nextCoaches, nextPlayers] = await Promise.all([
        getSchedule(activeToken, { dateFrom, dateTo }),
        getRecurringPrograms(activeToken),
        getScheduleCourts(),
        getScheduleMembers(activeToken, "coach"),
        getScheduleMembers(activeToken, "player"),
      ]);

      setScheduleItems(schedule);
      setPrograms(nextPrograms);
      setCourts(nextCourts);
      setCoaches(nextCoaches);
      setPlayers(nextPlayers);

      setLessonForm((current) => ({
        ...current,
        courtId: current.courtId || nextCourts[0]?.id || "",
        coachId:
          current.coachId ||
          (user?.role === "coach" ? user.id : nextCoaches[0]?.id || ""),
        playerId: current.playerId || nextPlayers[0]?.id || "",
      }));

      setProgramForm((current) => ({
        ...current,
        courtId: current.courtId || nextCourts[0]?.id || "",
        coachId:
          current.coachId ||
          (user?.role === "coach" ? user.id : nextCoaches[0]?.id || ""),
      }));
    } catch (err: any) {
      setError(err.message || "Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadData(token);
  }, [token, dateFrom, dateTo]);

  const groupedSchedule = useMemo(() => {
    return weekDates.map((date) => {
      const dateKey = format(date, "yyyy-MM-dd");
      return {
        dateKey,
        label: format(date, "EEE, MMM d"),
        items: scheduleItems.filter((item) => item.date === dateKey),
      };
    });
  }, [scheduleItems, weekDates]);

  const summary = useMemo(() => {
    return {
      reservations: scheduleItems.filter((item) => item.sourceType === "court_reservation").length,
      lessons: scheduleItems.filter((item) => item.sourceType === "private_lesson").length,
      sessions: scheduleItems.filter((item) => item.sourceType === "program_session").length,
    };
  }, [scheduleItems]);

  const handleCreateLesson = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      await createPrivateLessonRecord(token, {
        courtId: lessonForm.courtId,
        coachId: lessonForm.coachId,
        playerId: lessonForm.playerId,
        date: lessonForm.date,
        timeSlot: {
          start: lessonForm.start,
          end: lessonForm.end,
        },
        lessonType: lessonForm.lessonType || undefined,
        price: lessonForm.price ? Number(lessonForm.price) : undefined,
        notes: lessonForm.notes || undefined,
      });

      setSuccess("Private lesson created.");
      await loadData(token);
    } catch (err: any) {
      setError(err.message || "Failed to create private lesson");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateProgram = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      await createRecurringProgramRecord(token, {
        name: programForm.name,
        coachId: programForm.coachId,
        courtId: programForm.courtId,
        weekday: Number(programForm.weekday),
        startTime: programForm.startTime,
        endTime: programForm.endTime,
        capacity: Number(programForm.capacity),
        startsOn: programForm.startsOn,
        endsOn: programForm.endsOn || undefined,
        price: programForm.price ? Number(programForm.price) : undefined,
        description: programForm.description || undefined,
      });

      setSuccess("Recurring program created.");
      await loadData(token);
    } catch (err: any) {
      setError(err.message || "Failed to create recurring program");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          <span className="gradient-text">Schedule Board</span>
        </h1>
        <p className="text-gray-600">
          Court reservations, private lessons, and recurring program sessions in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-sm text-gray-500">Court Reservations</div>
          <div className="text-2xl font-bold">{summary.reservations}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Private Lessons</div>
          <div className="text-2xl font-bold">{summary.lessons}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Program Sessions</div>
          <div className="text-2xl font-bold">{summary.sessions}</div>
        </div>
      </div>

      <div className="card flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm text-gray-500">Viewing Week</div>
          <div className="text-lg font-semibold">
            {format(weekDates[0], "MMM d")} to {format(weekDates[6], "MMM d, yyyy")}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, -7))}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Previous Week
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
          >
            This Week
          </button>
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, 7))}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Next Week
          </button>
        </div>
      </div>

      {(error || success) && (
        <div className={`card ${error ? "border-red-200" : "border-green-200"}`}>
          <p className={error ? "text-red-600" : "text-green-600"}>{error || success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <form onSubmit={handleCreateLesson} className="card space-y-4">
          <div>
            <h2 className="text-xl font-bold">Add Private Lesson</h2>
            <p className="text-sm text-gray-500">Reserve a court for a coach-player session.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Coach</label>
              <select
                value={lessonForm.coachId}
                onChange={(event) => setLessonForm((prev) => ({ ...prev, coachId: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.firstName} {coach.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Player</label>
              <select
                value={lessonForm.playerId}
                onChange={(event) => setLessonForm((prev) => ({ ...prev, playerId: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.firstName} {player.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Court</label>
              <select
                value={lessonForm.courtId}
                onChange={(event) => setLessonForm((prev) => ({ ...prev, courtId: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {courts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Date</label>
              <input
                type="date"
                value={lessonForm.date}
                onChange={(event) => setLessonForm((prev) => ({ ...prev, date: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Start</label>
              <input
                type="time"
                value={lessonForm.start}
                onChange={(event) => setLessonForm((prev) => ({ ...prev, start: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">End</label>
              <input
                type="time"
                value={lessonForm.end}
                onChange={(event) => setLessonForm((prev) => ({ ...prev, end: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Lesson Type</label>
              <input
                type="text"
                value={lessonForm.lessonType}
                onChange={(event) => setLessonForm((prev) => ({ ...prev, lessonType: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Price</label>
              <input
                type="number"
                min="0"
                value={lessonForm.price}
                onChange={(event) => setLessonForm((prev) => ({ ...prev, price: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600">Notes</label>
            <textarea
              value={lessonForm.notes}
              onChange={(event) => setLessonForm((prev) => ({ ...prev, notes: event.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Create Private Lesson"}
          </button>
        </form>

        <form onSubmit={handleCreateProgram} className="card space-y-4">
          <div>
            <h2 className="text-xl font-bold">Add Recurring Program</h2>
            <p className="text-sm text-gray-500">Create a weekly clinic or group session block.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm text-gray-600">Program Name</label>
              <input
                type="text"
                value={programForm.name}
                onChange={(event) => setProgramForm((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="High Performance Juniors"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Coach</label>
              <select
                value={programForm.coachId}
                onChange={(event) => setProgramForm((prev) => ({ ...prev, coachId: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.firstName} {coach.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Court</label>
              <select
                value={programForm.courtId}
                onChange={(event) => setProgramForm((prev) => ({ ...prev, courtId: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {courts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Weekday</label>
              <select
                value={programForm.weekday}
                onChange={(event) => setProgramForm((prev) => ({ ...prev, weekday: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {[0, 1, 2, 3, 4, 5, 6].map((weekday) => (
                  <option key={weekday} value={weekday}>
                    {weekdayLabel(weekday)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Capacity</label>
              <input
                type="number"
                min="1"
                value={programForm.capacity}
                onChange={(event) => setProgramForm((prev) => ({ ...prev, capacity: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Start Time</label>
              <input
                type="time"
                value={programForm.startTime}
                onChange={(event) => setProgramForm((prev) => ({ ...prev, startTime: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">End Time</label>
              <input
                type="time"
                value={programForm.endTime}
                onChange={(event) => setProgramForm((prev) => ({ ...prev, endTime: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Starts On</label>
              <input
                type="date"
                value={programForm.startsOn}
                onChange={(event) => setProgramForm((prev) => ({ ...prev, startsOn: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Ends On</label>
              <input
                type="date"
                value={programForm.endsOn}
                onChange={(event) => setProgramForm((prev) => ({ ...prev, endsOn: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Price</label>
              <input
                type="number"
                min="0"
                value={programForm.price}
                onChange={(event) => setProgramForm((prev) => ({ ...prev, price: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600">Description</label>
            <textarea
              value={programForm.description}
              onChange={(event) => setProgramForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Create Recurring Program"}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="mb-4">
          <h2 className="text-xl font-bold">Weekly Schedule</h2>
          <p className="text-sm text-gray-500">All court usage across the selected week.</p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading schedule...</div>
        ) : (
          <div className="space-y-6">
            {groupedSchedule.map((day) => (
              <div key={day.dateKey}>
                <div className="mb-2 text-sm font-semibold text-gray-700">{day.label}</div>
                {day.items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500">
                    No schedule items.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {day.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-gray-200 px-4 py-3"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">{item.title}</div>
                            <div className="text-sm text-gray-600">
                              {item.startTime} - {item.endTime} on {item.courtName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.primaryPerson}
                              {item.secondaryPerson ? ` | ${item.secondaryPerson}` : ""}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 capitalize">
                            {item.sourceType.replace("_", " ")} | {item.status.replace("_", " ")}
                          </div>
                        </div>
                        {item.notes && (
                          <div className="mt-2 text-sm text-gray-600">{item.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="mb-4">
          <h2 className="text-xl font-bold">Recurring Programs</h2>
          <p className="text-sm text-gray-500">Current weekly program definitions.</p>
        </div>
        {programs.length === 0 ? (
          <div className="text-sm text-gray-500">No recurring programs yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {programs.map((program) => (
              <div key={program.id} className="rounded-lg border border-gray-200 p-4">
                <div className="font-semibold">{program.name}</div>
                <div className="text-sm text-gray-600">
                  {weekdayLabel(program.weekday)} | {program.startTime} - {program.endTime}
                </div>
                <div className="text-sm text-gray-600">
                  Capacity {program.capacity} | Status {program.status}
                </div>
                <div className="text-sm text-gray-500">
                  Starts {program.startsOn}
                  {program.endsOn ? ` | Ends ${program.endsOn}` : ""}
                </div>
                {program.description && (
                  <div className="mt-2 text-sm text-gray-600">{program.description}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
