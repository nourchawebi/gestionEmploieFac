import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { ScheduleService } from '../services/emploie.service'; // Service qui récupère les horaires
import { Schedule, Session } from '../models/emploie'; // Types de données utilisés pour les horaires et les sessions
import html2pdf from 'html2pdf.js'; // Bibliothèque pour convertir le contenu HTML en PDF

// Définition du composant Angular
@Component({
  selector: 'app-emploie-affichage', // Sélecteur pour lier ce composant au HTML
  templateUrl: './affiche-emploi.component.html', // Template HTML du composant
  styleUrls: ['./affiche-emploi.component.css'] // Fichier CSS pour la mise en forme
})
export class EmploiAffichageComponent implements OnInit {

  // Propriétés pour stocker les sessions, les jours, les heures et le tableau d'emploi du temps
  sessions: Session[] = [];
  days: string[] = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]; // Liste des jours de la semaine
  hours: string[] = []; // Liste des heures, à remplir dynamiquement
  timetable: { [hour: string]: { [day: string]: Session | null } } = {}; // Tableau pour organiser les sessions par heure et jour
  displayedColumns: string[] = ["hour", ...this.days]; // Colonnes à afficher dans le tableau (heures + jours)

  selectedClass: string = ''; // Classe sélectionnée par l'utilisateur
  loading: boolean = false; // Indicateur de chargement
  errorMessage: string = ''; // Message d'erreur en cas de problème
  subjectColors: { [subject: string]: string } = {}; // Stocke les couleurs des matières
  classefound=false;

  // Liste de couleurs prédéfinies pour assigner une couleur unique à chaque matière
  predefinedColors: string[] = [
    "#FF5733", "#33FF57", "#3357FF", "#F2C300", "#FF8C00", "#8A2BE2", "#FF1493", "#20B2AA", "#FFD700", "#ADFF2F",
    "#F08080", "#C71585", "#4682B4", "#7FFF00", "#D2691E", "#DC143C", "#B0C4DE", "#FF6347", "#98FB98", "#FFFACD",
    "#FF4500", "#32CD32", "#1E90FF", "#FF6347", "#8B4513", "#C0C0C0", "#800080", "#808000", "#008080", "#FF00FF",
    "#6A5ACD", "#FF1493", "#F0E68C", "#D3D3D3", "#B22222", "#5F9EA0", "#7CFC00", "#0000FF", "#FFD700", "#4B0082",
    "#FF7F50", "#8B008B", "#00FA9A", "#228B22", "#B8860B", "#A52A2A", "#800000", "#BC8F8F", "#FF6A6A", "#3CB371"
  ];

  // Injection des services nécessaires pour récupérer les données et effectuer des changements
  constructor(private scheduleService: ScheduleService, private cdr: ChangeDetectorRef) {}

  // Méthode appelée lors de l'initialisation du composant
  ngOnInit(): void {}

  // Méthode pour récupérer l'emploi du temps pour la classe sélectionnée
  fetchSchedule(): void {
    if (!this.selectedClass.trim()) { // Si la classe n'est pas valide
      this.errorMessage = 'Veuillez entrer une classe valide.'; // Afficher un message d'erreur
      this.classefound=false;
      return;
    }

    this.loading = true; // Indiquer que l'on charge les données
    this.errorMessage = ''; // Réinitialiser le message d'erreur
this.sessions=[];
    // Appeler le service pour récupérer les horaires pour la classe sélectionnée
    this.scheduleService.getScheduleForClass(this.selectedClass).subscribe(
      (data) => {
        // Aplatir les données pour récupérer toutes les sessions
        if (data && Array.isArray(data) ) {
          console.log("data: ", data)
          this.sessions = data.flatMap(schedule => schedule.sessions || []); // Safely access sessions
        }
console.log("sessions", this.sessions)
        if (this.sessions.length === 0) {
          this.classefound = false;
        } else {
          this.classefound = true;
        }
        console.log(this.classefound)
        // Trier les heures en ordre croissant
        this.hours = [...new Set(this.sessions.map(session => session.time))].sort((a, b) => this.compareTimes(a, b));

        // Initialiser le tableau d'emploi du temps pour chaque heure et jour
        this.timetable = {};
        this.hours.forEach(hour => {
          this.timetable[hour] = {};
          this.days.forEach(day => {
            this.timetable[hour][day] = null; // Initialiser chaque cellule à null
          });
        });

        // Remplir le tableau d'emploi du temps avec les sessions
        this.sessions.forEach(session => {
          if (this.timetable[session.time] && this.timetable[session.time][session.day] !== undefined) {
            this.timetable[session.time][session.day] = session;
          }

          // Assigner une couleur unique à chaque matière
          this.assignSubjectColor(session.subject);
        });

        this.loading = false; // Fin du chargement
        this.cdr.detectChanges(); // Déclencher la détection des changements pour mettre à jour l'affichage

      },
      (error) => {
        this.errorMessage = 'Erreur lors du chargement de l\'emploi du temps.'; // Afficher un message d'erreur en cas de problème
        this.loading = false; // Fin du chargement
        this.classefound=false;
      }
    );
  }

  // Fonction pour trier les horaires dans un format de 24 heures
  compareTimes(a: string, b: string): number {
    const [aStart, aEnd] = a.split('-').map(time => this.convertTo24Hour(time));
    const [bStart, bEnd] = b.split('-').map(time => this.convertTo24Hour(time));
    return aStart - bStart;
  }


  // Convertir une heure en format 12h (am/pm) en format 24h
  convertTo24Hour(time: string): number {
    const regex = /(\d+)(am|pm)/;
    const match = time.match(regex);

    if (!match) return 0; // Si le format de l'heure n'est pas correct, retourner 0

    let hours = parseInt(match[1], 10);
    if (match[2] === 'pm' && hours !== 12) {
      hours += 12; // Convertir l'heure en format 24h pour l'après-midi
    } else if (match[2] === 'am' && hours === 12) {
      hours = 0; // Minuit est converti en 0h
    }
    return hours;
  }

  // Assigner une couleur unique à chaque matière
  assignSubjectColor(subject: string): void {
    if (!this.subjectColors[subject]) { // Si la matière n'a pas encore de couleur
      const color = this.getUniqueColor(subject); // Obtenir une couleur unique
      this.subjectColors[subject] = color; // Assigner cette couleur à la matière
    }
  }


  // Obtenir une couleur unique à partir d'un tableau de couleurs prédéfinies
  getUniqueColor(subject: string): string {
    let hash = 0;
    for (let i = 0; i < subject.length; i++) {
      hash = subject.charCodeAt(i) + ((hash << 5) - hash); // Calculer un hash de la matière
    }
    const index = Math.abs(hash) % this.predefinedColors.length; // Trouver l'index de la couleur
    return this.predefinedColors[index]; // Retourner la couleur correspondante
  }

  // Méthode pour télécharger l'emploi du temps sous forme de fichier PDF
  downloadPDF(): void {
    var element = document.getElementById('timetable-table'); // ID de l'élément HTML (tableau)

    if (element) {
      const options = {
        margin: 10,
        filename: 'emploi_du_temps.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf(element, options); // Utiliser html2pdf pour convertir le contenu en PDF
    }
  }
}
