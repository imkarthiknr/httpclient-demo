import { DataserviceService } from './../dataservice.service';
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(private http: HttpClient, private dataobj: DataserviceService) { }
  data:Array<any>;
  search:string;
  getDetails()
  {
    this.http.get("http://jsonplaceholder.typicode.com/users?id="+this.search).subscribe((data) => this.displaydata(data));  
  }
  displaydata(data) 
  {
    let url="http://localhost:3000/posts";
    this.http.post(url,{search:this.search}).toPromise().then((data:any)=>{console.log(data);
  }
}
