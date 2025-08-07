import { AzureDevOpsService } from 'src/app/shared/services/azure-devops.service';
import { NotificationService } from './notification.service';
import { Injectable } from '@angular/core';
import readXlsxFile, { Schema } from 'read-excel-file';

import { RowXlsxDTO } from '../models/dtos/row-xlsx.dto';
import { UserStoryDTO } from '../models/dtos/user-story.dto';
import { TaskDTO } from '../models/dtos/task.dto';
import { WorkItemDTO } from '../models/dtos/work-item.dto';
import { FeatureDTO } from '../models/dtos/feature.dto';

@Injectable({
  providedIn: 'root'
})
export class ImportXlsxService {
  xlsxSchema: Schema<RowXlsxDTO, string> = {
    Nome: {
      prop: "title",
      type: String,
    },
    Tipo: {
      prop: "type",
      type: String,
      oneOf: [
        'Feature',
        'User Story',
        'Task',
      ]
    },
    Estimativa: {
      prop: "estimate",
      type: Number,
      required: false,
    },
    Responsavel: {
      prop: "assignedTo",
      type: String,
      required: false,
    },
    Tags: {
      prop: "tags",
      type: String,
      required: false,
    },
    WorkItemId: {
      prop: "workItemId",
      type: String,
      required: false,
    },
    ParentId: {
      prop: "parentId",
      type: String,
      required: false,
    },
  };

  constructor(
    private notificationService: NotificationService,
    private azureDevOpsService: AzureDevOpsService,
  ) { }

  public async handleImportXLSX(projectName: string, teamName: string, file: File) {
    let featuries: FeatureDTO[] = [];
    let userStories: UserStoryDTO[] = [];
    try {
      const { rows, errors } = await readXlsxFile<RowXlsxDTO>(file, {
        schema: this.xlsxSchema,
        includeNullValues: false,
        ignoreEmptyRows: true
      });

      if (errors.length > 0) {
        this.notificationService.notifyError('Planilha com layout incorreto');
        errors.forEach(error => {
          let message = `Linha: ${error.row} -> Coluna '${error.column}' é obrigatória`;
          this.notificationService.notifyWarning(message);
        })
        return null;
      }

      for (let row of rows) {
        if (row.type == "Feature") {
          let feature: FeatureDTO = {
            id: row.workItemId ?? '',
            title: row.title,
            userStories: [],
            parentId: row.parentId ?? '',
            needCreate: true
          };

          featuries.push(feature);
        }

        if (row.type == "User Story") {
          let userStory: UserStoryDTO = {
            id: row.workItemId ?? '',
            title: row.title,
            assignedTo: row.assignedTo,
            estimate: row.estimate?.toString(),
            tags: row.tags ?? "",
            tasks: [],
            parentId: row.parentId ?? '',
          };

          userStories.push(userStory);

          if (!row.parentId) {
            let feature = featuries.at(featuries.length - 1);

            if (!feature) {
              feature = new FeatureDTO();
              feature.userStories.push(userStory);
              featuries.push(feature);
            } else {
              feature.userStories.push(userStory);
              featuries[featuries.length - 1] = feature;
            }


          } else {
            let index = featuries.findIndex(
              (feature) => feature?.id == row.parentId
            );

            let feature: FeatureDTO;

            if (index >= 0) {
              feature = featuries.at(index);
            } else {
              const workItem: WorkItemDTO = await this.azureDevOpsService.getWorkItem(projectName, row.parentId);

              feature = {
                id: row.parentId,
                title: workItem.fields['System.Title'],
                userStories: [],
              };

              featuries.push(feature);
            }
            feature.userStories.push(userStory);
          }
        }

        if (row.type == "Task") {
          let task: TaskDTO = {
            title: row.title,
            estimate: row.estimate?.toString(),
            remaining: row.estimate?.toString(),
            assignedTo: row.assignedTo,
            tags: row.tags ?? "",
          };

          if (!row.parentId) {
            let userStory = userStories.at(userStories.length - 1);
            userStory.tasks.push(task);

            userStories[userStories.length - 1] = userStory;
          } else {
            let index = userStories.findIndex(
              (userStory) => userStory?.id == row.parentId
            );

            let userStory: UserStoryDTO;

            if (index >= 0) {
              userStory = userStories.at(index);
            } else {
              const workItem: WorkItemDTO = await this.azureDevOpsService.getWorkItem(projectName, row.parentId);

              userStory = {
                id: row.parentId,
                title: workItem.fields['System.Title'],
                assignedTo: workItem.fields['System.AssignedTo'],
                estimate: workItem.fields['Custom.EstimativaProjeto'],
                tags: workItem.fields['System.Tags'],
                tasks: [],
              };

              userStories.push(userStory);
            }
            userStory.tasks.push(task);
          }
        }
      }

      this.notificationService.notifySuccess('Leitura realizada');
      return featuries;
    } catch (error) {
      console.error("Erro ao ler o arquivo:", error);
      throw error;
    }
  }
}
