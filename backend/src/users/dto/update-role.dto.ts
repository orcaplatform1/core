import { IsIn } from 'class-validator';
export class UpdateRoleDto {
  @IsIn(['GUEST', 'STUDENT', 'STAFF', 'SUPER_ADMIN'])
  role!: string;
}
