import { LearningPlayer } from '@/components/education/LearningPlayer';

export default async function LessonLearningPage({
  params,
}: {
  params: Promise<{ course: string; lesson: string }>;
}) {
  const { course, lesson } = await params;
  return <LearningPlayer courseSlug={course} lessonSlug={lesson} />;
}
