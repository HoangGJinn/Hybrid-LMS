import { CourseOverview } from '../components/CourseOverview';

const LecturerClassesPage = () => {
  return (
    <CourseOverview
      basePath="/lecturer/classes"
      title="Tổng quan về khóa học"
      emptyTitle="Chưa có khóa học nào"
      emptyDescription="Không tìm thấy khóa học nào phù hợp với bộ lọc hiện tại."
    />
  );
};

export default LecturerClassesPage;
