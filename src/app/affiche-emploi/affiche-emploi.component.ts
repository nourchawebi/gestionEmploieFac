import {Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef} from '@angular/core';
import { ScheduleService } from '../services/emploie.service';
import { Schedule, Session } from '../models/emploie';
import html2pdf from 'html2pdf.js';

@Component({
  selector: 'app-emploie-affichage',
  templateUrl: './affiche-emploi.component.html',
  styleUrls: ['./affiche-emploi.component.css']
})
export class EmploiAffichageComponent implements OnInit {

  sessions: Session[] = [];
  days: string[] = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  hours: string[] = [];
  timetable: { [hour: string]: { [day: string]: Session | null } } = {};
  displayedColumns: string[] = ["hour", ...this.days];
  selectedClass: string = '';
  loading: boolean = false;
  errorMessage: string = '';
  subjectColors: { [subject: string]: string } = {}; // Store subject colors

  // Predefined color list to ensure uniqueness
  predefinedColors: string[] = [
    "#FF5733", "#33FF57", "#3357FF", "#F2C300", "#FF8C00", "#8A2BE2", "#FF1493", "#20B2AA", "#FFD700", "#ADFF2F",
    "#F08080", "#C71585", "#4682B4", "#7FFF00", "#D2691E", "#DC143C", "#B0C4DE", "#FF6347", "#98FB98", "#FFFACD",
    "#FF4500", "#32CD32", "#1E90FF", "#FF6347", "#8B4513", "#C0C0C0", "#800080", "#808000", "#008080", "#FF00FF",
    "#6A5ACD", "#FF1493", "#F0E68C", "#D3D3D3", "#B22222", "#5F9EA0", "#7CFC00", "#0000FF", "#FFD700", "#4B0082",
    "#FF7F50", "#8B008B", "#00FA9A", "#228B22", "#B8860B", "#A52A2A", "#800000", "#BC8F8F", "#FF6A6A", "#3CB371"
  ];


  constructor(private scheduleService: ScheduleService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {}

  fetchSchedule(): void {
    if (!this.selectedClass.trim()) {
      this.errorMessage = 'Veuillez entrer une classe valide.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.scheduleService.getScheduleForClass(this.selectedClass).subscribe(
      (data) => {
        this.sessions = data.flatMap(schedule => schedule.sessions);

        // Sort the hours in ascending order
        this.hours = [...new Set(this.sessions.map(session => session.time))].sort((a, b) => this.compareTimes(a, b));

        // Initialize timetable for each hour and day
        this.timetable = {};
        this.hours.forEach(hour => {
          this.timetable[hour] = {};
          this.days.forEach(day => {
            this.timetable[hour][day] = null;
          });
        });

        // Populate timetable with sessions
        this.sessions.forEach(session => {
          if (this.timetable[session.time] && this.timetable[session.time][session.day] !== undefined) {
            this.timetable[session.time][session.day] = session;
          }

          // Assign a unique color to each subject
          this.assignSubjectColor(session.subject);
        });

        this.loading = false;
        this.cdr.detectChanges();
      },
      (error) => {
        this.errorMessage = 'Erreur lors du chargement de l\'emploi du temps.';
        this.loading = false;
      }
    );
  }

  // Sort times in 24-hour format
  compareTimes(a: string, b: string): number {
    const [aStart, aEnd] = a.split('-').map(time => this.convertTo24Hour(time));
    const [bStart, bEnd] = b.split('-').map(time => this.convertTo24Hour(time));
    return aStart - bStart;
  }

  // Convert time (e.g., "8am" or "2pm") to 24-hour format
  convertTo24Hour(time: string): number {
    const regex = /(\d+)(am|pm)/;
    const match = time.match(regex);

    if (!match) return 0;

    let hours = parseInt(match[1], 10);
    if (match[2] === 'pm' && hours !== 12) {
      hours += 12;
    } else if (match[2] === 'am' && hours === 12) {
      hours = 0;
    }
    return hours;
  }

  // Assign a unique color to each subject
  assignSubjectColor(subject: string): void {
    if (!this.subjectColors[subject]) {
      const color = this.getUniqueColor(subject);
      this.subjectColors[subject] = color;
    }
  }

  // Retrieve a unique color from the predefined color set
  getUniqueColor(subject: string): string {
    let hash = 0;
    for (let i = 0; i < subject.length; i++) {
      hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % this.predefinedColors.length;
    return this.predefinedColors[index];
  }
  // Capture the timetable as HTML and convert it to PDF
  downloadPDF(): void {
    var element = document.getElementById('timetable-table'); // ID of the table element

    if (element) {
      const options = {
        margin:       10,
        filename:     'emploi_du_temps.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf(element, options);  // Generate the PDF from the HTML table
    }
  }
}



