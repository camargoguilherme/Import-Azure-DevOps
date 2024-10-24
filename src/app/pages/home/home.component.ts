import { Component, OnInit } from '@angular/core';

import { IterationDTO } from 'src/app/shared/models/dtos/iteration.dto';
import { ProjectDTO } from 'src/app/shared/models/dtos/project.dto';
import { FeatureDTO } from 'src/app/shared/models/dtos/feature.dto';
import { AuthenticationService } from 'src/app/shared/services/authentication.service';
import { AzureDevOpsService } from 'src/app/shared/services/azure-devops.service';
import { ImportXlsxService } from 'src/app/shared/services/import-xlsx.service';
import { NotificationService } from 'src/app/shared/services/notification.service';
import { TeamDTO } from 'src/app/shared/models/dtos/team';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  projects: ProjectDTO[] = [];
  iterations: IterationDTO[] = [];
  featuries: FeatureDTO[] = [];
  teams: TeamDTO[] = [];
  projectSelected: string = undefined;
  iterationSelected: string = undefined;
  teamSelected: string = undefined;
  status: "initial" | "uploading" | "success" | "fail" = "initial"; // Variable to store file status
  file: File | null = null; // Variable to store file

  constructor(
    private authenticationService: AuthenticationService,
    private azureDevOpsService: AzureDevOpsService,
    private notificationService: NotificationService,
    private importXlsxService: ImportXlsxService
  ) { }

  ngOnInit() {
    this.authenticationService.validateSession().then(result => {
      this.handleProjects();
    });

  }

  private sortByName(itemA: any, itemB: any) {
    return itemA.name.localeCompare(itemB.name);
  }

  async handleProjects() {
    const projects = await this.azureDevOpsService.getProjects();
    projects.sort(this.sortByName)
    this.projects = projects;
  }

  async handleTeams() {
    const teams = await this.azureDevOpsService.getTeams(this.projectSelected);
    teams.sort(this.sortByName)
    this.teams = teams;
  }

  async handleChangeProject() {
    await this.handleTeams();
    if (this.teams.length == 1) {
      this.teamSelected = this.teams[0].name;
      await this.handleIterations();
    }
  }

  async handleChangeTeams() {
    await this.handleIterations();
  }

  async handleIterations() {
    if (this.projectSelected == null) return;
    const iterations = await this.azureDevOpsService.getIterations(this.projectSelected);
    iterations.sort(this.sortByName);
    this.iterations = iterations;
  }

  async handleCreateWorkItems() {
    if (this.file) {
      this.azureDevOpsService.createWorkItems(
        this.projectSelected,
        this.iterationSelected,
        this.featuries
      ).then(result => {
        this.featuries = result;

        this.notificationService.notifySuccess('Importação realizado com sucesso');

        this.handleClearSelections();
      }).catch(error => {
        this.notificationService.notifyError('Falha ao realizar importação');
      });
    } else {
      this.notificationService.notifyInfo('Selecione um arquivo');
    }
  }

  handleRemoveTask(indexFeature: number, indexUserStory: number, indexTask: number) {
    const feature = this.featuries[indexFeature];
    let userStory = feature.userStories[indexUserStory];
    userStory.tasks.splice(indexTask, 1);

    feature.userStories[indexUserStory] = userStory;
    userStory.tasks.splice(indexTask, 1);

    this.featuries[indexFeature] = feature;
  }

  // On file Select
  async onChange(event: any) {
    const file: File = event.target.files[0];

    if (file && this.projectSelected) {
      // we will implement this method later
      this.file = file
      this.featuries = await this.importXlsxService.handleImportXLSX(this.projectSelected, this.teamSelected, file);
    }
  }

  handleClearSelections() {
    this.projectSelected = this.iterationSelected = '';
    this.file = undefined;
  }
}
