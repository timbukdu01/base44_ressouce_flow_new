import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  startOfMonth, endOfMonth, eachDayOfInterval, 
  format, isWeekend, isSameDay, differenceInDays,
  startOfWeek, endOfWeek, addMonths, subMonths,
  addWeeks, subWeeks
} from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, User, MapPin, Wrench, ChevronLeft, ChevronRight } from "lucide-react";

const priorityColors = {
  low: "bg-gray-400",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-600"
};

const typeIcons = {
  employee: User,
  room: MapPin,
  equipment: Wrench
};

export default function GanttChart({ tasks, resources, selectedMonth: initialMonth }) {
  const [timeRange, setTimeRange] = useState("month");
  const [selectedDate, setSelectedDate] = useState(initialMonth || new Date());

  const getTimeInterval = () => {
    switch (timeRange) {
      case "week":
        return {
          start: startOfWeek(selectedDate, { locale: de }),
          end: endOfWeek(selectedDate, { locale: de })
        };
      case "month":
        return {
          start: startOfMonth(selectedDate),
          end: endOfMonth(selectedDate)
        };
      case "quarter":
        const quarterStart = startOfMonth(subMonths(selectedDate, selectedDate.getMonth() % 3));
        return {
          start: quarterStart,
          end: endOfMonth(addMonths(quarterStart, 2))
        };
      default:
        return {
          start: startOfMonth(selectedDate),
          end: endOfMonth(selectedDate)
        };
    }
  };

  const interval = getTimeInterval();
  const days = eachDayOfInterval({ start: interval.start, end: interval.end });
  const totalDays = days.length;
  const today = new Date();

  const navigatePrevious = () => {
    switch (timeRange) {
      case "week":
        setSelectedDate(subWeeks(selectedDate, 1));
        break;
      case "month":
        setSelectedDate(subMonths(selectedDate, 1));
        break;
      case "quarter":
        setSelectedDate(subMonths(selectedDate, 3));
        break;
    }
  };

  const navigateNext = () => {
    switch (timeRange) {
      case "week":
        setSelectedDate(addWeeks(selectedDate, 1));
        break;
      case "month":
        setSelectedDate(addMonths(selectedDate, 1));
        break;
      case "quarter":
        setSelectedDate(addMonths(selectedDate, 3));
        break;
    }
  };

  const navigateToday = () => {
    setSelectedDate(new Date());
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case "week":
        return `KW ${format(selectedDate, "w", { locale: de })}, ${format(selectedDate, "yyyy")}`;
      case "month":
        return format(selectedDate, "MMMM yyyy", { locale: de });
      case "quarter":
        const quarter = Math.floor(selectedDate.getMonth() / 3) + 1;
        return `Q${quarter} ${format(selectedDate, "yyyy")}`;
      default:
        return format(selectedDate, "MMMM yyyy", { locale: de });
    }
  };

  const getTaskPosition = (startDate, endDate) => {
    const taskStart = new Date(startDate);
    const taskEnd = new Date(endDate);
    
    const clampedStart = taskStart < interval.start ? interval.start : taskStart;
    const clampedEnd = taskEnd > interval.end ? interval.end : taskEnd;
    
    const startDay = differenceInDays(clampedStart, interval.start);
    const duration = differenceInDays(clampedEnd, clampedStart) + 1;
    
    const left = (startDay / totalDays) * 100;
    const width = (duration / totalDays) * 100;
    
    return { 
      left: `${Math.max(0, left)}%`, 
      width: `${Math.min(width, 100 - left)}%`,
      isPartial: taskStart < interval.start || taskEnd > interval.end
    };
  };

  const getTasksForResource = (resourceId) => {
    return tasks.filter(t => 
      t.assigned_resources?.includes(resourceId) &&
      t.status !== "cancelled" &&
      t.status !== "completed"
    );
  };

  const resourcesWithTasks = resources
    .map(r => ({
      ...r,
      tasks: getTasksForResource(r.id)
    }))
    .filter(r => r.tasks.length > 0);

  // Determine day header format based on time range
  const getDayHeaderFormat = () => {
    if (timeRange === "quarter") {
      return { primary: "dd", secondary: "MMM" };
    }
    return { primary: "dd", secondary: "EEE" };
  };

  const dayFormat = getDayHeaderFormat();

  return (
    <Card className="border-0 shadow-lg bg-white">
      <CardHeader className="border-b pb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Gantt-Diagramm: {getTimeRangeLabel()}
          </CardTitle>
          
          <div className="flex flex-wrap items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Woche</SelectItem>
                <SelectItem value="month">Monat</SelectItem>
                <SelectItem value="quarter">Quartal</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={navigatePrevious}
                className="h-9 w-9"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={navigateToday}
                className="text-sm"
              >
                Heute
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={navigateNext}
                className="h-9 w-9"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Timeline Header */}
            <div className="sticky top-0 bg-gray-50 border-b z-10">
              <div className="flex">
                <div className="w-48 flex-shrink-0 p-3 font-semibold text-sm text-gray-700 border-r">
                  Ressource
                </div>
                <div className="flex-1 flex">
                  {days.map((day, index) => (
                    <div
                      key={index}
                      className={`flex-1 text-center py-2 text-xs border-r ${
                        isWeekend(day) ? "bg-gray-100" : ""
                      } ${
                        isSameDay(day, today) ? "bg-blue-100 font-semibold" : ""
                      }`}
                    >
                      <div className="font-medium">{format(day, dayFormat.primary, { locale: de })}</div>
                      <div className="text-gray-500">{format(day, dayFormat.secondary, { locale: de })}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Gantt Rows */}
            <div className="divide-y">
              {resourcesWithTasks.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Keine Aufgaben für diesen Zeitraum geplant
                </div>
              ) : (
                resourcesWithTasks.map(resource => {
                  const Icon = typeIcons[resource.type];
                  return (
                    <div key={resource.id} className="flex hover:bg-gray-50">
                      <div className="w-48 flex-shrink-0 p-3 border-r">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{resource.name}</p>
                            <p className="text-xs text-gray-500">
                              {resource.tasks.length} {resource.tasks.length === 1 ? "Aufgabe" : "Aufgaben"}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-1 relative" style={{ minHeight: "60px" }}>
                        {/* Weekend highlights */}
                        <div className="absolute inset-0 flex">
                          {days.map((day, index) => (
                            <div
                              key={index}
                              className={`flex-1 ${isWeekend(day) ? "bg-gray-50" : ""}`}
                            />
                          ))}
                        </div>

                        {/* Today indicator */}
                        {days.findIndex(day => isSameDay(day, today)) !== -1 && (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
                            style={{
                              left: `${(days.findIndex(day => isSameDay(day, today)) / totalDays) * 100}%`
                            }}
                          />
                        )}

                        {/* Task bars */}
                        <div className="relative h-full py-2 px-1">
                          {resource.tasks.map((task, taskIndex) => {
                            const position = getTaskPosition(task.start_date, task.end_date);
                            const priorityColor = priorityColors[task.priority] || priorityColors.medium;
                            
                            return (
                              <div
                                key={task.id}
                                className={`absolute ${priorityColor} text-white rounded px-2 py-1 shadow-sm hover:shadow-md transition-all cursor-pointer z-20 ${
                                  position.isPartial ? "border-2 border-dashed border-white" : ""
                                }`}
                                style={{
                                  left: position.left,
                                  width: position.width,
                                  top: `${8 + taskIndex * 24}px`,
                                  minWidth: "40px"
                                }}
                                title={`${task.title}\n${format(new Date(task.start_date), "dd.MM.yyyy")} - ${format(new Date(task.end_date), "dd.MM.yyyy")}\nPriorität: ${task.priority}`}
                              >
                                <div className="text-xs font-medium truncate flex items-center gap-1">
                                  {task.title}
                                  {task.progress > 0 && task.progress < 100 && (
                                    <span className="text-xs opacity-75">({task.progress}%)</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="border-t bg-gray-50 p-4">
          <div className="flex flex-wrap gap-4 items-center text-sm">
            <span className="font-medium text-gray-700">Priorität:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600 rounded"></div>
              <span>Dringend</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span>Hoch</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>Mittel</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-400 rounded"></div>
              <span>Niedrig</span>
            </div>
            <div className="ml-4 flex items-center gap-2">
              <div className="w-0.5 h-6 bg-blue-500"></div>
              <span>Heute</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}