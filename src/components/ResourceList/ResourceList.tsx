import { ResourceItem } from "../../types/k8s";
import { formatAge } from "../../utils/formatAge";

interface Props {
  items: ResourceItem[];
  onSelect: (item: ResourceItem) => void;
  selectedKey?: string;
  resourceType?: string;
  continueToken?: string;
  onLoadMore?: () => void;
}

interface Column {
  key: string;
  label: string;
  getValue: (item: ResourceItem) => string;
}

function getColumns(resourceType?: string): Column[] {
  const nameCol: Column = {
    key: "name",
    label: "Name",
    getValue: (i) => i.name,
  };
  const nsCol: Column = {
    key: "namespace",
    label: "Namespace",
    getValue: (i) => i.namespace ?? "-",
  };
  const statusCol: Column = {
    key: "status",
    label: "Status",
    getValue: (i) => i.status ?? "-",
  };
  const ageCol: Column = {
    key: "age",
    label: "Age",
    getValue: (i) => (i.age ? formatAge(i.age) : "-"),
  };

  switch (resourceType) {
    case "nodes":
    case "namespaces":
      return [nameCol, statusCol, ageCol];
    case "deployments":
      return [
        nameCol,
        nsCol,
        { key: "ready", label: "Ready", getValue: (i) => i.status ?? "-" },
        ageCol,
      ];
    case "configmaps":
    case "secrets":
      return [nameCol, nsCol, ageCol];
    default:
      return [nameCol, nsCol, statusCol, ageCol];
  }
}

export default function ResourceList({ items, onSelect, selectedKey, resourceType, continueToken, onLoadMore }: Props) {
  if (items.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm flex items-center justify-center h-full">
        No resources found
      </div>
    );
  }

  const columns = getColumns(resourceType);

  return (
    <div>
      <table className="w-full text-sm text-left text-gray-300 border-collapse">
        <thead className="text-xs text-gray-400 uppercase bg-gray-800 sticky top-0">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-2 font-medium">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const rowKey = `${item.namespace ?? ""}-${item.name}`;
            return (
            <tr
              key={rowKey}
              onClick={() => onSelect(item)}
              className={`border-b border-gray-800 cursor-pointer hover:bg-gray-700 transition-colors ${
                rowKey === selectedKey ? "bg-gray-700" : ""
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="px-4 py-1.5 text-gray-400"
                >
                  {col.key === "name" ? (
                    <span className="font-medium text-white">{col.getValue(item)}</span>
                  ) : col.key === "status" || col.key === "ready" ? (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        col.getValue(item) === "Running"
                          ? "bg-green-900 text-green-400"
                          : col.getValue(item) === "Pending"
                          ? "bg-yellow-900 text-yellow-400"
                          : col.getValue(item) === "Failed"
                          ? "bg-red-900 text-red-400"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {col.getValue(item)}
                    </span>
                  ) : col.key === "age" ? (
                    <span className="text-xs">{col.getValue(item)}</span>
                  ) : (
                    col.getValue(item)
                  )}
                </td>
              ))}
            </tr>
            );
          })}
        </tbody>
      </table>
      {continueToken && (
        <button onClick={onLoadMore} className="w-full py-2 text-xs text-blue-400 hover:text-blue-300">
          더 불러오기
        </button>
      )}
    </div>
  );
}
