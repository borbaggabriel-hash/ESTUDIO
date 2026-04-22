import { Course } from "@/types/hubschool";
import { CourseCard } from "./CourseCard";

interface PopularCoursesProps {
  courses: Course[];
  limit?: number;
}

export function PopularCourses({ courses, limit = 5 }: PopularCoursesProps) {
  const popularCourses = courses
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Popular Courses</h2>
      <div className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory hide-scrollbar">
        {popularCourses.map((course) => (
          <div key={course.id} className="min-w-[300px] snap-center">
            <CourseCard course={course} />
          </div>
        ))}
      </div>
    </div>
  );
}
