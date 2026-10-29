import { CourseOverview } from '../components/CourseOverview';

const CoursesPage = () => {
  return (
    <CourseOverview
      basePath="/student/courses"
      title="Tổng quan về khóa học"
      subtitle="Các khóa học bạn đang tham gia trong học kỳ"
      emptyTitle="Chưa có khóa học nào"
      emptyDescription="Bạn chưa đăng ký khóa học nào hoặc không tìm thấy khóa học phù hợp với bộ lọc."
    />
  );
};

export default CoursesPage;
