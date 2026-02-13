export interface AccountStructure {
  id: number;
  parentId?: number;
  level: number;
  code: string;
  name: string;
  sortOrder: number;
  children?: AccountStructure[];
}

export interface AccountClassOption {
  id: number;
  code: string;
  name: string;
  path: string;
}
