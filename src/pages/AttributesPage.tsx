import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Chip, Stack, Typography } from '@mui/material';
import { api } from '../lib/api';
import { PageLayout, DataTable, SearchBar, StatusChip } from '../design-system';
import type { Column } from '../design-system';
import type { AttributeDefinitionDto, AttributeSchemaDto } from '../lib/types';
import ar from '../i18n/ar';

interface FlatDefinition extends AttributeDefinitionDto {
  groupCode: string;
  groupName: string;
}

export function AttributesPage() {
  const [search, setSearch] = useState('');

  const { data: schema, isLoading } = useQuery({
    queryKey: ['attributes', 'schema'],
    queryFn: () => api.get<AttributeSchemaDto>('/api/attributes/schema'),
  });

  const rows = useMemo<FlatDefinition[]>(() => {
    const all = (schema?.groups ?? []).flatMap((g) =>
      g.definitions.map((d) => ({ ...d, groupCode: g.code, groupName: g.nameAr })),
    );
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((d) =>
      d.nameAr.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      d.groupName.toLowerCase().includes(q),
    );
  }, [schema, search]);

  const columns: Column<FlatDefinition>[] = [
    { key: 'groupName', header: ar.attributes.group, render: (r) => r.groupName, width: 150 },
    { key: 'nameAr', header: ar.attributes.name, render: (r) => r.nameAr },
    { key: 'code', header: ar.attributes.code, render: (r) => <Typography variant="body2" color="text.secondary" fontFamily="monospace">{r.code}</Typography>, width: 180 },
    { key: 'dataType', header: ar.attributes.dataType, render: (r) => r.dataType, width: 130 },
    { key: 'unit', header: ar.attributes.unit, render: (r) => r.unit || '—', width: 90 },
    { key: 'validations', header: ar.attributes.validations, render: (r) => (
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        {r.validations.length === 0
          ? <Typography variant="body2" color="text.secondary">—</Typography>
          : r.validations.map((v) => (
              <Chip key={`${v.ruleType}:${v.value}`} label={`${v.ruleType}: ${v.value}`} size="small" variant="outlined" />
            ))}
      </Stack>
    )},
    { key: 'active', header: ar.attributes.active, render: (r) => (
      <StatusChip label={r.active ? ar.attributes.active : ar.attributes.inactive} color={r.active ? 'success' : 'default'} />
    ), width: 110 },
  ];

  return (
    <PageLayout title={ar.attributes.title} subtitle={ar.attributes.subtitle}>
      <SearchBar value={search} onSearch={setSearch} />
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => `${r.groupCode}:${r.code}`}
        loading={isLoading}
        emptyMessage={ar.attributes.noDefinitions}
        enableColumnToggle
      />
    </PageLayout>
  );
}
