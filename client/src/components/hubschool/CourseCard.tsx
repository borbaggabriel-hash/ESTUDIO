import { Course } from "@/types/hubschool";
import { Badge } from "@/components/ui/badge";
import { Clock, BarChart } from "lucide-react";
import { Link } from "wouter";

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  const isContinuing = localStorage.getItem(`hubschool-progress-${course.id}`);

  return (
    <Link href={`/hubschool/course/${course.slug}`}>
      <div className="group cursor-pointer bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 h-full flex flex-col relative">
        <div className="relative aspect-video overflow-hidden">
          <img 
            src={course.thumbnail} 
            alt={course.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <Badge className="absolute top-3 left-3 bg-white/90 text-black backdrop-blur-sm shadow-sm hover:bg-white">
            {course.category}
          </Badge>
          {isContinuing && (
            <Badge className="absolute bottom-3 right-3 bg-primary text-primary-foreground shadow-md">
              Continue Watching
            </Badge>
          )}
        </div>
        
        <div className="p-5 flex flex-col flex-1">
          <h3 className="font-bold text-lg leading-tight mb-2 text-gray-900 group-hover:text-primary transition-colors line-clamp-2">
            {course.title}
          </h3>
          
          <p className="text-sm text-gray-500 mb-4 line-clamp-2 flex-1">
            {course.description}
          </p>
          
          <div className="flex items-center justify-between text-xs text-gray-400 mt-auto pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{course.duration}</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <BarChart className="w-3.5 h-3.5" />
              <span>{course.level}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
