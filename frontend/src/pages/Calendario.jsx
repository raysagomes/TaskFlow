import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { FaCalendarAlt } from "react-icons/fa";
import Footer from "../components/Footer";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import axios from "axios";

export default function Calendario() {
  const [events, setEvents] = useState({});
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayWeekday = new Date(year, month, 1).getDay();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3001/api/calendar/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (response && response.data && typeof response.data === "object") {
          setEvents(response.data);
        } else {
          console.error("Unexpected response data:", response.data);
          setEvents({});
        }
      } catch (error) {
        console.error(
          "Error fetching events:",
          error.response ? error.response.data : error.message
        );
        setEvents({});
      }
    };

    if (token && userId) {
      fetchEvents();
    } else {
      console.error("Token or User ID not found in localStorage");
    }
  }, [token, userId]);

  const handleDayClick = async (day) => {
    const dateKey = formatDateKey(year, month, day);
    const currentEvent = events[dateKey] || "";
    const newEvent = window.prompt(
      `Add event/notes for ${dateKey}:`,
      currentEvent
    );
    if (newEvent === null) return;

    try {
      await axios.post(
        "http://localhost:3001/api/calendar",
        {
          userId,
          data: dateKey,
          evento: newEvent.trim(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setEvents((prev) => {
        if (newEvent.trim() === "") {
          const newEvents = { ...prev };
          delete newEvents[dateKey];
          return newEvents;
        } else {
          return { ...prev, [dateKey]: newEvent.trim() };
        }
      });
    } catch (error) {
      console.error("Error saving event", error);
    }
  };

  const formatDateKey = (y, m, d) => {
    const mm = (m + 1).toString().padStart(2, "0");
    const dd = d.toString().padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  };

  const calendarCells = [];

  for (let i = 0; i < firstDayWeekday; i++) {
    calendarCells.push(
      <div key={"empty-start-" + i} className="calendar-cell empty-cell"></div>
    );
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, month, day);
    const hasEvent = dateKey in events;

    const daySquare = (
      <div
        key={dateKey}
        className={`calendar-cell day-cell ${hasEvent ? "event-day" : ""}`}
        onClick={() => handleDayClick(day)}
        style={{ cursor: "pointer" }}
      >
        {day}
      </div>
    );

    if (hasEvent) {
      calendarCells.push(
        <OverlayTrigger
          key={`overlay-${dateKey}`}
          placement="top"
          overlay={
            <Tooltip id={`tooltip-${dateKey}`}>{events[dateKey]}</Tooltip>
          }
        >
          {daySquare}
        </OverlayTrigger>
      );
    } else {
      calendarCells.push(daySquare);
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div
        className="sidebar-container"
        style={{ width: "250px", marginTop: "60px" }}
      >
        <Sidebar />
      </div>
      <div className="calendar-container" role="region" aria-label="Calendar">
        <div className="calendario-header">
          <h1 className="tituloh1">Calendário</h1>
          <FaCalendarAlt size={50} className="icon-header" />
        </div>
        <div className="calendar-header">
          {dayNames.map((dayName) => (
            <div key={dayName} aria-label={`Day ${dayName}`}>
              {dayName}
            </div>
          ))}
        </div>
        <div className="calendar-grid">{calendarCells}</div>
      </div>
    </div>
  );
}
