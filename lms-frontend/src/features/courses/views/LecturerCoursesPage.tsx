import { CourseOverview } from '../components/CourseOverview';

const LecturerClassesPage = () => {
  return (
    <CourseOverview
      basePath="/lecturer/classes"
      title="Tổng quan về khóa học"
      subtitle="Quản lý khóa học và học liệu cho từng lớp học"
      emptyTitle="Chưa có khóa học nào"
      emptyDescription="Không tìm thấy khóa học nào phù hợp với bộ lọc hiện tại."
    />
  );
};

export default LecturerClassesPage;
