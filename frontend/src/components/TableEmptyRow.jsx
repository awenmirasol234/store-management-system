import { EmptyState } from "./EmptyState.jsx";

export function TableEmptyRow(props) {
  return (
    <tr>
      <td colSpan={props.colSpan} className="px-5">
        <EmptyState message={props.message} padding={props.padding} />
      </td>
    </tr>
  );
}
