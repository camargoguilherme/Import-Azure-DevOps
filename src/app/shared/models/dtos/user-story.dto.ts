import { TaskDTO } from "./task.dto";

export class UserStoryDTO {
  id: string = '';
  title: string = '';
  estimate?: string = '';
  assignedTo?: string = '';
  tags?: string = '';
  tasks: TaskDTO[] = []
  parentId?: string = '';
}
