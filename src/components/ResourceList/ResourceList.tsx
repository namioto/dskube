import { ResourceItem } from "../../types/k8s";

interface Props {
  items: ResourceItem[];
  onSelect: (item: ResourceItem) => void;
  selectedName?: string;
}

export default function ResourceList({ items, onSelect, selectedName }: Props) {
  if (items.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm flex items-center justify-center h-full">
        No resources found
      </div>
    );
  }

  return (
    <table className="w-full text-sm text-left text-gray-300 border-collapse">
      <thead className="text-xs text-gray-400 uppercase bg-gray-800 sticky top-0">
        <tr>
          <th className="px-4 py-2 font-medium">Name</th>
          <th className="px-4 py-2 font-medium">Namespace</th>
          <th className="px-4 py-2 font-medium">Status</th>
          <th className="px-4 py-2 font-medium">Age</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr
            key={`${item.namespace ?? ""}-${item.name}`}
            onClick={() => onSelect(item)}
            className={`border-b border-gray-800 cursor-pointer hover:bg-gray-700 transition-colors ${
              selectedName === item.name ? "bg-gray-700" : ""
            }`}
          >
            <td className="px-4 py-1.5 font-medium text-white">{item.name}</td>
            <td className="px-4 py-1.5 text-gray-400">{item.namespace ?? "-"}</td>
            <td className="px-4 py-1.5">
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  item.status === "Running"
                    ? "bg-green-900 text-green-400"
                    : item.status === "Pending"
                    ? "bg-yellow-900 text-yellow-400"
                    : item.status === "Failed"
                    ? "bg-red-900 text-red-400"
                    : "bg-gray-800 text-gray-400"
                }`}
              >
                {item.status ?? "-"}
              </span>
            </td>
            <td className="px-4 py-1.5 text-gray-400 text-xs">{item.age ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
