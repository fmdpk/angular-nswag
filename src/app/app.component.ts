import {Component, inject, OnInit} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {Client} from "./api/api-client";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit{
  title = 'angular-v18.0.0';
  client = inject(Client)

  ngOnInit() {
    this.client.todosGET().subscribe(res => console.log(res))
  }
}
