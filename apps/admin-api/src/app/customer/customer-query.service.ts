// import { Injectable } from "@nestjs/common";
// import { InjectRepository } from "@nestjs/typeorm";
// import { QueryService } from "@ptc-org/nestjs-query-core";
// import { CustomerEntity } from "@ridy/database";
// import { Repository } from "typeorm";
// import { CustomerDTO } from "./dto/customer.dto";

// @Injectable()
// @QueryService(CustomerEntity) // this decorator is optional, but common
// export class CustomerService extends QueryService<CustomerDTO> {
//   constructor(@InjectRepository(CustomerEntity) repo: Repository<CustomerEntity>) {
//     super(repo);
//   }
// }
