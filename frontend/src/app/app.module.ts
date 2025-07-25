import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from './app-routing-module';
import { HomeComponent } from './components/home.component';

@NgModule({
  imports: [
    BrowserModule,
    AppRoutingModule,
    RouterModule,
    HomeComponent
  ],
  providers: [],
  bootstrap: []
})
export class AppModule {}
