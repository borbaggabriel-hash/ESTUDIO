import { useRoute, Link } from "wouter";
import { ArrowLeft, Play, Clock, BarChart, User, Share2, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import coursesData from "@/data/hubschool-courses.json";
import { Course } from "@/types/hubschool";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/nav/AppHeader";

export default function HubSchoolCourse() {
  const [match, params] = useRoute("/hubschool/course/:slug");
  const slug = params?.slug;
  const course = slug ? (coursesData as Course[]).find((c) => c.slug === slug) : undefined;
  const [lang, setLang] = useState<"en" | "pt">(() => {
    const saved = localStorage.getItem("vhub_language");
    return saved === "pt" ? "pt" : "en";
  });

  useEffect(() => {
    if (course) {
      localStorage.setItem(`hubschool-progress-${course.id}`, new Date().toISOString());
    }
  }, [course]);

  useEffect(() => {
    localStorage.setItem("vhub_language", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  if (!match) return <div>Course not found</div>;

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Course not found</h1>
        <Link href="/hubschool">
          <Button>Back to HubSchool</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <AppHeader lang={lang} setLang={setLang} />

      <main className="pt-[60px]">
        {/* Course Hero */}
        <div className="bg-muted/20 py-12 md:py-20 border-b border-border/10">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Link href="/hubschool?scroll=courses" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6">
                <ArrowLeft className="w-4 h-4" />
                <span className="font-medium">Back to Courses</span>
              </Link>
              <Badge className="mb-6 bg-primary/10 text-primary hover:bg-primary/20 border-0 text-sm px-3 py-1">
                {course.category}
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-[1.1]">
                {course.title}
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                {course.description}
              </p>
              
              <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-muted-foreground mb-10">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart className="w-4 h-4" />
                  <span>{course.level}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button className="h-12 px-8 text-lg rounded-full shadow-lg hover:shadow-xl transition-all">
                  Start Learning Now
                </Button>
              </div>
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black group cursor-pointer">
              <img 
                src={course.thumbnail} 
                alt={course.title} 
                className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 text-white fill-current ml-1" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-bold mb-8">Course Content</h2>
          
          <Accordion type="single" collapsible className="w-full space-y-4">
            {course.content.map((module, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border border-gray-100 rounded-xl px-6 bg-white shadow-sm data-[state=open]:shadow-md transition-all">
                <AccordionTrigger className="hover:no-underline py-6">
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">
                      {index + 1}
                    </div>
                    <span className="font-semibold text-lg">{module.moduleTitle}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6 pl-12">
                  <div className="prose prose-gray max-w-none">
                    <p>{module.body}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </main>
    </div>
  );
}
