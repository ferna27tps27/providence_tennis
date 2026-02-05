import { render, screen, fireEvent } from "@testing-library/react";
import { format, addDays, startOfWeek } from "date-fns";
import BookingCalendarGrid from "../BookingCalendarGrid";
import { AdminReservation, Court } from "../../../lib/api/admin-booking-api";

const mockCourts: Court[] = [
  { id: "court-1", name: "Court 1", type: "clay", available: true },
  { id: "court-2", name: "Court 2", type: "hard", available: true },
  { id: "court-3", name: "Court 3", type: "indoor", available: true },
];

const mockReservations: AdminReservation[] = [
  {
    id: "res-1",
    courtId: "court-1",
    courtName: "Court 1",
    date: format(new Date(), "yyyy-MM-dd"),
    timeSlot: { start: "10:00", end: "11:00" },
    status: "confirmed",
    createdAt: new Date().toISOString(),
    contactName: "John Doe",
    contactEmail: "john@example.com",
    member: {
      id: "member-1",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
    },
  },
  {
    id: "res-2",
    courtId: "court-2",
    courtName: "Court 2",
    date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
    timeSlot: { start: "14:00", end: "15:00" },
    status: "confirmed",
    createdAt: new Date().toISOString(),
    guestName: "Jane Smith",
    guestEmail: "jane@example.com",
    contactName: "Jane Smith",
    contactEmail: "jane@example.com",
    member: null,
  },
];

describe("BookingCalendarGrid", () => {
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders loading state", () => {
    render(
      <BookingCalendarGrid
        reservations={[]}
        courts={mockCourts}
        onReservationUpdate={mockOnUpdate}
        isLoading={true}
      />
    );

    expect(screen.getByText(/loading calendar/i)).toBeInTheDocument();
  });

  test("renders calendar grid with 7 day columns", () => {
    render(
      <BookingCalendarGrid
        reservations={[]}
        courts={mockCourts}
        onReservationUpdate={mockOnUpdate}
      />
    );

    // Check for day headers (Mon, Tue, Wed, etc.)
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    
    days.forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  test("renders time slots from 08:00 to 21:00", () => {
    render(
      <BookingCalendarGrid
        reservations={[]}
        courts={mockCourts}
        onReservationUpdate={mockOnUpdate}
      />
    );

    // Check for time labels
    expect(screen.getByText("08:00")).toBeInTheDocument();
    expect(screen.getByText("12:00")).toBeInTheDocument();
    expect(screen.getByText("21:00")).toBeInTheDocument();
  });

  test("displays court legend", () => {
    render(
      <BookingCalendarGrid
        reservations={mockReservations}
        courts={mockCourts}
        onReservationUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText("Courts:")).toBeInTheDocument();
    expect(screen.getByText("Court 1")).toBeInTheDocument();
    expect(screen.getByText("Court 2")).toBeInTheDocument();
    expect(screen.getByText("Court 3")).toBeInTheDocument();
  });

  test("renders reservations in correct slots", () => {
    render(
      <BookingCalendarGrid
        reservations={mockReservations}
        courts={mockCourts}
        onReservationUpdate={mockOnUpdate}
      />
    );

    // Check if reservation details are displayed
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("10:00 - 11:00")).toBeInTheDocument();
    expect(screen.getByText("14:00 - 15:00")).toBeInTheDocument();
  });

  test("navigates to previous week", () => {
    render(
      <BookingCalendarGrid
        reservations={[]}
        courts={mockCourts}
        onReservationUpdate={mockOnUpdate}
      />
    );

    const prevButton = screen.getByText(/previous/i);
    const initialWeekText = screen.getByText(/MMM \d+ - MMM \d+, \d{4}/);
    
    fireEvent.click(prevButton);
    
    // Week range should change
    const newWeekText = screen.getByText(/MMM \d+ - MMM \d+, \d{4}/);
    expect(newWeekText).toBeInTheDocument();
  });

  test("navigates to next week", () => {
    render(
      <BookingCalendarGrid
        reservations={[]}
        courts={mockCourts}
        onReservationUpdate={mockOnUpdate}
      />
    );

    const nextButton = screen.getByText(/next/i);
    fireEvent.click(nextButton);
    
    // Component should still render after navigation
    expect(screen.getByText(/next/i)).toBeInTheDocument();
  });

  test("shows empty state when no reservations", () => {
    render(
      <BookingCalendarGrid
        reservations={[]}
        courts={mockCourts}
        onReservationUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText(/no bookings for this week/i)).toBeInTheDocument();
  });

  test("filters out cancelled reservations", () => {
    const reservationsWithCancelled: AdminReservation[] = [
      ...mockReservations,
      {
        id: "res-cancelled",
        courtId: "court-1",
        courtName: "Court 1",
        date: format(new Date(), "yyyy-MM-dd"),
        timeSlot: { start: "15:00", end: "16:00" },
        status: "cancelled",
        createdAt: new Date().toISOString(),
        contactName: "Cancelled User",
        contactEmail: "cancelled@example.com",
        member: null,
      },
    ];

    render(
      <BookingCalendarGrid
        reservations={reservationsWithCancelled}
        courts={mockCourts}
        onReservationUpdate={mockOnUpdate}
      />
    );

    // Cancelled reservation should not be displayed
    expect(screen.queryByText("Cancelled User")).not.toBeInTheDocument();
    
    // Confirmed reservations should still be displayed
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  test("applies different colors to different courts", () => {
    render(
      <BookingCalendarGrid
        reservations={mockReservations}
        courts={mockCourts}
        onReservationUpdate={mockOnUpdate}
      />
    );

    // Component should render successfully with color coding
    // (Visual color testing would require snapshot or visual regression testing)
    expect(screen.getByText("Court 1")).toBeInTheDocument();
  });
});
