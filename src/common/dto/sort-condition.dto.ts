import { IsIn, IsString } from 'class-validator';

export class SortConditionDto {
  @IsString()
  column: string;

  @IsIn(['ASC', 'DESC'])
  direction: 'ASC' | 'DESC';
}
