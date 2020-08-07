import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DataserviceService {

  constructor() { }
  sendDetails():Observable<any>{
    const url = "http://localhost:3000/posts";
    return this.http.get<any>(url);
}
}
